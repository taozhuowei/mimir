/**
 * critical-css-inline — H5 prod-only Vite plugin.
 *
 * Inlines every `<link rel="stylesheet">` referenced from the entry HTML
 * directly into `<head>` as a `<style data-critical>` tag and strips the
 * original `<link>` tags. Non-stylesheet `<link>` tags (modulepreload,
 * preload, icons) are preserved.
 *
 * Reason: the entry CSS chunks (uni.css + index-*.css) are render-blocking;
 * inlining them lets first paint happen as soon as the HTML byte stream
 * arrives. Total inlined CSS is small (~30 KB) so the trade-off favours
 * FCP over cacheability on cold starts.
 *
 * Implementation note: vite + @dcloudio/vite-plugin-uni both inject CSS
 * `<link>` tags during their own `transformIndexHtml` post-handlers, AFTER
 * any user-land `transformIndexHtml` (even with `enforce: 'post'`) — by the
 * time we'd see the HTML in `transformIndexHtml` the tags aren't all in
 * place yet. We therefore hook `generateBundle`, which fires after every
 * asset (including index.html) has been emitted but BEFORE files hit disk,
 * and rewrite the `index.html` asset's `source` in-place. The CSS chunks
 * we need to inline are siblings in the same `bundle` object.
 */

import type { Plugin } from 'vite'

interface CssAsset {
  type: 'asset'
  fileName: string
  source: string | Uint8Array
}

function isCssAsset(value: unknown): value is CssAsset {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    obj.type === 'asset'
    && typeof obj.fileName === 'string'
    && obj.fileName.endsWith('.css')
    && (typeof obj.source === 'string' || obj.source instanceof Uint8Array)
  )
}

interface HtmlAsset {
  type: 'asset'
  fileName: string
  source: string | Uint8Array
}

function isHtmlAsset(value: unknown): value is HtmlAsset {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    obj.type === 'asset'
    && typeof obj.fileName === 'string'
    && obj.fileName.endsWith('.html')
    && (typeof obj.source === 'string' || obj.source instanceof Uint8Array)
  )
}

function readAsString(source: string | Uint8Array): string {
  if (typeof source === 'string') return source
  return Buffer.from(source).toString('utf8')
}

/**
 * Match any `<link ...>` tag; we filter for `rel="stylesheet"` + grab the
 * `href` value in a second pass to keep the regex simple. The optional
 * self-close slash and trailing `</link>` are tolerated by browsers but
 * Vite never emits them, so we don't need to consume them here.
 */
const LINK_TAG = /<link\b[^>]*>/gi
const HREF_ATTR = /\bhref\s*=\s*["']([^"']+)["']/i
const REL_STYLESHEET = /\brel\s*=\s*["']stylesheet["']/i

/**
 * Normalise an href found in HTML to the bundle-relative fileName key.
 * Vite emits links as `./assets/foo.css` (relative) or `/assets/foo.css`
 * (rooted); the bundle key is `assets/foo.css`.
 */
function hrefToFileName(href: string): string {
  let normalised = href.trim()
  if (normalised.startsWith('./')) normalised = normalised.slice(2)
  else if (normalised.startsWith('/')) normalised = normalised.slice(1)
  return normalised
}

export default function criticalCssInline(): Plugin {
  return {
    name: 'mimir:critical-css-inline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Build fileName → css text lookup once per bundle.
      const cssAssets = new Map<string, string>()
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (isCssAsset(asset)) cssAssets.set(fileName, readAsString(asset.source))
      }
      if (cssAssets.size === 0) return

      for (const [fileName, asset] of Object.entries(bundle)) {
        if (!isHtmlAsset(asset)) continue
        if (!fileName.endsWith('index.html')) continue

        const html = readAsString(asset.source)
        const collected: string[] = []
        const stripped = html.replaceAll(LINK_TAG, (tag) => {
          if (!REL_STYLESHEET.test(tag)) return tag
          const hrefMatch = HREF_ATTR.exec(tag)
          if (!hrefMatch) return tag
          const key = hrefToFileName(hrefMatch[1])
          const css = cssAssets.get(key)
          if (css === undefined) return tag
          collected.push(css)
          return ''
        })

        if (collected.length === 0) continue

        const styleBlock = `<style data-critical>${collected.join('\n')}</style>`
        // Inject right before `</head>` so the critical CSS lands inside the
        // <head> (browsers ignore <style> in body for FOUC purposes anyway,
        // but staying in head is the conventional contract).
        //
        // The skeleton path below is a historical fallback: an earlier
        // revision shipped an inline `<style data-skeleton>` HTML App Shell
        // and we had to land `data-critical` *before* it so cascade order
        // kept the skeleton on top. The skeleton was removed (it produced
        // a phase-reset double animation on Vue mount), but we keep the
        // probe as a defensive cheap branch in case it ever returns.
        const skeletonOpen = /<style\b[^>]*\bdata-skeleton\b[^>]*>/i
        let rewritten: string
        if (skeletonOpen.test(stripped)) {
          rewritten = stripped.replace(skeletonOpen, (match) => `${styleBlock}\n${match}`)
        } else if (/<\/head>/i.test(stripped)) {
          rewritten = stripped.replace(/<\/head>/i, `${styleBlock}\n</head>`)
        } else {
          rewritten = `${styleBlock}\n${stripped}`
        }

        ;(asset as HtmlAsset).source = rewritten
      }
    },
  }
}
