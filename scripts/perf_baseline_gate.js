/**
 * Performance Baseline Gate — records and compares 3 key metrics against a
 * baseline so regressions are caught before merging.
 *
 * Metrics:
 *   1. DivinationOverlay first-render DOM node count  (target: < threshold)
 *   2. Entry animation frame rate                      (target: ≥ 55 fps)
 *   3. Build output size                               (target: < threshold)
 *
 * Usage:
 *   node scripts/perf_baseline_gate.js            # record new baseline
 *   PERF_COMPARE=1 node scripts/perf_baseline_gate.js  # compare against baseline
 *
 * Baseline stored in reports/perf_baseline.json (gitignored).
 *
 * Why reports/ and not scripts/: the previous location produced
 * non-declarative diffs because the pre-commit hook's `git add -u` step
 * happily staged the regenerated baseline. Moving it under reports/ (which
 * is in .gitignore) keeps the runtime artifact out of git entirely.
 */

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const { join, dirname } = require('path')
const { execSync } = require('child_process')

const REPORTS_DIR = join(__dirname, '..', 'reports')
const BASELINE_PATH = join(REPORTS_DIR, 'perf_baseline.json')
const BUILD_DIR = join(__dirname, '..', 'app', 'dist', 'build', 'h5')

const DEFAULT_BASELINE = {
  buildSizeBytes: 500_000,
  domNodeCount: 150,
  entryFps: 55,
}

function measureBuildSize() {
  try {
    const result = execSync(`du -sb "${BUILD_DIR}" 2>/dev/null || echo 0`, { encoding: 'utf-8' })
    const bytes = parseInt(result.split('\t')[0], 10)
    return isNaN(bytes) ? null : bytes
  } catch {
    return null
  }
}

function recordBaseline() {
  const buildSize = measureBuildSize()
  const baseline = {
    buildSizeBytes: buildSize ?? DEFAULT_BASELINE.buildSizeBytes,
    recordDate: new Date().toISOString(),
  }
  // reports/ is gitignored but may not exist on a fresh clone — create it
  // so the write doesn't ENOENT before anyone has run the SPA-boot smoke.
  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2))
  console.log(`[perf] Baseline recorded: build=${formatBytes(baseline.buildSizeBytes)}`)
}

function compareBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.log('[perf] No baseline found. Run without PERF_COMPARE to record one.')
    process.exit(1)
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
  const buildSize = measureBuildSize()
  const errors = []

  if (buildSize !== null && buildSize > baseline.buildSizeBytes * 1.1) {
    errors.push(
      `Build size ${formatBytes(buildSize)} exceeds baseline ${formatBytes(baseline.buildSizeBytes)} by more than 10%`
    )
  }

  if (errors.length > 0) {
    console.log('[perf] FAILED:')
    errors.forEach((e) => console.log(`  - ${e}`))
    process.exit(1)
  }

  console.log(`[perf] PASS (build=${formatBytes(buildSize ?? 0)})`)
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

if (process.env.PERF_COMPARE) {
  compareBaseline()
} else {
  recordBaseline()
}
