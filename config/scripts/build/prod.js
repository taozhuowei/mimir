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

const path = require('path')
const { REPO_ROOT, VITE_BIN, makeProcessRunner } = require('../lib/run_process')

const run = makeProcessRunner('build')

// uni-app derives the output dir from cwd by default (-> <cwd>/dist/...). We
// pin it explicitly under app/dist so every build artefact lives beside the
// app/ workspaces. UNI_OUTPUT_DIR must be ABSOLUTE: vite re-resolves it via
// path.resolve(config.root, outDir) where config.root is app/frontend, so a
// relative value would land at app/frontend/app/dist. path.resolve ignores
// config.root when the value is already absolute.
const uniOutDir = (...segments) => path.join(REPO_ROOT, 'app', 'dist', ...segments)

async function build_h5() {
  return run(
    'h5: vite build (production)',
    'node',
    [VITE_BIN, 'build', '--mode', 'production', '--config', 'app/frontend/vite.config.ts'],
    {
      NODE_ENV: 'production',
      UNI_INPUT_DIR: 'app/frontend/src',
      VITE_ROOT_DIR: 'app/frontend',
      UNI_OUTPUT_DIR: uniOutDir('build', 'h5'),
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
      UNI_OUTPUT_DIR: uniOutDir('build', 'mp-weixin'),
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
  // Bundle-size regression check. Compares app/dist/build/h5/ against the
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
