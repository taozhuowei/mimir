/**
 * Name: core/utils/preload_assets
 * Purpose: warm the browser image cache for boot-critical visuals: the theme
 *          card-back (the idle deck is 12 copies) plus the UI icons (including
 *          the 4-phase progress icons). On slow hosts these stream in after
 *          first paint and leave blank gaps; decoding them before the main
 *          surface reveals removes that gap. Card faces are intentionally NOT
 *          preloaded here: only one is drawn per session (single_card spread),
 *          so each face is fetched on demand by its <image> when drawn.
 *          Preloading all 78 faces (~77MB) only evicted these small icons from
 *          the HTTP cache, which is the regression this avoids.
 * Reason: App.vue.bootstrap() previously only loaded metadata (the asset URLs)
 *          — never the bytes — so the surface mounted with empty <image> nodes.
 * Note: H5 / browser only. Callers must guard invocation with #ifdef H5; the
 *          mini-program runtime has no Image() / HTMLImageElement.decode().
 */

/**
 * Resolve once the image is decoded (ready to paint), errored, or the timeout
 * elapses — never rejects, so one slow asset can't stall boot. Module-private:
 * callers use preloadCritical.
 */
function preloadImage(url: string, timeoutMs: number): Promise<void> {
  if (!url) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      resolve()
    }
    const timer = setTimeout(finish, timeoutMs)
    const settle = (): void => {
      clearTimeout(timer)
      finish()
    }
    const img = new Image()
    img.onerror = settle
    img.src = url
    // Prefer decode() so "resolved" means paint-ready (no first-frame decode
    // jank on reveal); fall back to onload only where decode() is unavailable.
    // onerror + the timeout stay the safety net so this can never hang.
    if (typeof img.decode === 'function') {
      img.decode().then(settle, settle)
    } else {
      img.onload = settle
    }
  })
}

/**
 * Await every URL (decoded-or-timeout), in parallel, never rejecting. Use for
 * the few assets that gate the main-surface reveal (the card back). Falsy URLs
 * are skipped so an unconfigured theme asset is a no-op, not a stall.
 */
export function preloadCritical(urls: string[], timeoutMs = 8000): Promise<void> {
  return Promise.allSettled(
    urls.filter(Boolean).map(u => preloadImage(u, timeoutMs)),
  ).then(() => undefined)
}
