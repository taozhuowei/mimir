/**
 * Production build pipeline.
 *
 * Order:
 *   1. quality gate (unless --skip-quality) — pure code checks now (~30s)
 *   2. h5 build      (if target includes h5)
 *   3. mp build      (if target includes mp)
 *   4. server build  (if target includes server)
 *   5. perf baseline (if target includes h5 — bundle-size regression check)
 *
 * Steps run sequentially: vite build is CPU-bound and uniapp's two targets
 * fight over the same temp dirs when run in parallel. tsc is fast enough
 * that serialising it adds < 2s.
 */

'use strict'

const { REPO_ROOT, VITE_BIN, makeProcessRunner } = require('../lib/run_process')

const run = makeProcessRunner('build')

async function build_h5() {
  return run(
    'h5: vite build (production)',
    'node',
    [VITE_BIN, 'build', '--mode', 'production', '--config', 'app/frontend/vite.config.ts'],
    {
      NODE_ENV: 'production',
      UNI_INPUT_DIR: 'app/frontend/src',
      VITE_ROOT_DIR: 'app/frontend',
    },
  )
}

async function build_mp() {
  return run(
    'mp: vite build (production, mp-weixin)',
    'node',
    [VITE_BIN, 'build', '-p', 'mp-weixin', '--mode', 'production', '--config', 'app/frontend/vite.config.ts'],
    {
      NODE_ENV: 'production',
      UNI_INPUT_DIR: 'app/frontend/src',
      VITE_ROOT_DIR: 'app/frontend',
    },
  )
}

async function build_server() {
  return run('server: tsc compile', 'yarn', ['tsc', '-p', 'app/server/tsconfig.json'])
}

async function run_quality() {
  return run('quality gate (full)', 'node', ['config/scripts/quality_gate.js', 'full'])
}

async function run_perf_baseline() {
  // Bundle-size regression check. Compares dist/build/h5/ against the
  // committed perf_baseline.json. Lives here (not in quality_gate.js) because
  // it needs the freshly-built h5 artifacts on disk.
  return run('perf: baseline (bundle size)', 'node', ['config/scripts/perf_baseline_gate.js'])
}

module.exports = async function prodPipeline({ targets, skipQuality }) {
  if (!skipQuality) {
    await run_quality()
  } else {
    console.log('[build] Skipping quality gate (--skip-quality set)')
  }

  if (targets.includes('h5')) await build_h5()
  if (targets.includes('mp')) await build_mp()
  if (targets.includes('server')) await build_server()

  // perf gate only meaningful once h5 produced output.
  if (targets.includes('h5')) {
    await run_perf_baseline()
  }

  console.log('\n[build] Production pipeline complete')
  return 0
}
