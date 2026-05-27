/**
 * Subset the LXGW WenKai body fonts to the glyphs the app actually renders.
 *
 * Why: the upstream LXGW WenKai weights ship the full CJK set
 * (regular ≈ 8.1 MB, light ≈ 9.4 MB). The H5 first screen renders two
 * short Chinese lines (subtitle / guidance) in `var(--font-body)`, which
 * is enough to trigger an ~8 MB font download and starve the rest of the
 * first paint of bandwidth. Subsetting to the characters this product
 * can ever display cuts that to ~1 MB with zero visible loss.
 *
 * Coverage (superset of everything displayed, so no glyph is ever missing):
 *   - ASCII printable + common CJK / fullwidth punctuation blocks.
 *   - Every CJK-range codepoint found in the frontend source
 *     (app/frontend/src — UI copy, labels, errors, comments) and the
 *     backend reading corpus (app/server/src/data/*.json — the fixed,
 *     rule-based answer text). Scanning comments too is intentional: it
 *     guarantees the subset can never miss a displayed string, at the
 *     cost of a few comment-only glyphs.
 *
 * Output: `*.subset.woff2` alongside the originals. The originals are kept
 * as the subset source (re-run this after adding new copy); they are no
 * longer referenced by App.vue / theme.json, so clients never fetch them.
 *
 * Requires (one-time): a `python` on PATH with fonttools + brotli —
 *   python -m pip install fonttools brotli
 * Usage:
 *   node config/scripts/subset_fonts.js
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
// Upstream full-coverage fonts live OUTSIDE the served publicDir so they are
// never copied into the build / shipped to clients — they exist only as the
// subset source. The subsets are written into the served fonts dir.
const SRC_FONT_DIR = path.join(ROOT, 'app/server/assets-src/themes/golden_dawn/fonts')
const OUT_FONT_DIR = path.join(ROOT, 'app/server/public/static/themes/golden_dawn/fonts')

// Text sources whose characters must be renderable by the body font.
const SCAN_DIRS = [
  path.join(ROOT, 'app/frontend/src'),
  path.join(ROOT, 'app/server/src/data'),
]
const SCAN_EXTS = ['.vue', '.ts', '.json']
const SKIP_DIRS = new Set(['node_modules', 'dist'])

// Weight files share one glyph set — subset both identically.
const FONTS = [
  { src: 'lxgw-wenkai-light.woff2', out: 'lxgw-wenkai-light.subset.woff2' },
  { src: 'lxgw-wenkai-regular.woff2', out: 'lxgw-wenkai-regular.subset.woff2' },
]

// Punctuation / symbol ranges added wholesale so quotation marks, fullwidth
// forms, the ideographic space, etc. are always present regardless of which
// ones the corpus happens to use today. [from, to] inclusive, BMP only.
const FIXED_RANGES = [
  [0x0020, 0x007e], // ASCII printable
  [0x00a0, 0x00ff], // Latin-1 punctuation / symbols (·, ×, etc.)
  [0x2010, 0x2027], // general punctuation: dashes, quotes, ellipsis
  [0x2030, 0x205e], // per-mille, primes, misc punctuation
  [0x3000, 0x303f], // CJK symbols & punctuation: 。、《》「」『』〈〉…
  [0xff00, 0xffef], // fullwidth forms: ，！？：；（）％￥ + fullwidth latin
]

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(path.join(dir, entry.name), acc)
    } else if (SCAN_EXTS.some((e) => entry.name.endsWith(e))) {
      acc.push(path.join(dir, entry.name))
    }
  }
  return acc
}

function collectCodepoints() {
  const cps = new Set()
  for (const [from, to] of FIXED_RANGES) {
    for (let cp = from; cp <= to; cp += 1) cps.add(cp)
  }
  const files = []
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) walk(dir, files)
  }
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8')
    for (const ch of text) {
      const cp = ch.codePointAt(0)
      // 0x2E80 starts CJK Radicals; everything above covers Han, kana,
      // and CJK extensions — the glyphs the body font exists to render.
      if (cp >= 0x2e80) cps.add(cp)
    }
  }
  return cps
}

function subsetOne(srcPath, outPath, textFile) {
  const result = spawnSync(
    'python',
    [
      '-m', 'fontTools.subset', srcPath,
      `--text-file=${textFile}`,
      `--output-file=${outPath}`,
      '--flavor=woff2',
      '--with-zopfli',
      '--recommended-glyphs',
    ],
    { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf-8' },
  )
  if (result.status !== 0) {
    throw new Error(`pyftsubset failed for ${path.basename(srcPath)} (exit ${result.status})`)
  }
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function main() {
  const cps = collectCodepoints()
  const chars = [...cps].sort((a, b) => a - b).map((cp) => String.fromCodePoint(cp)).join('')
  const textFile = path.join(os.tmpdir(), `lxgw-subset-${process.pid}.txt`)
  fs.writeFileSync(textFile, chars, 'utf-8')
  console.log(`[subset] glyph set: ${cps.size} codepoints`)

  try {
    for (const font of FONTS) {
      const srcPath = path.join(SRC_FONT_DIR, font.src)
      const outPath = path.join(OUT_FONT_DIR, font.out)
      subsetOne(srcPath, outPath, textFile)
      const before = fs.statSync(srcPath).size
      const after = fs.statSync(outPath).size
      console.log(`[subset] ${font.src} ${mb(before)} -> ${font.out} ${mb(after)}`)
    }
  } finally {
    fs.rmSync(textFile, { force: true })
  }
  console.log('[subset] done')
}

main()
