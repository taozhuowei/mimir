import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

const current_file_path = fileURLToPath(import.meta.url)
const tools_dir = dirname(current_file_path)
const repo_root = dirname(tools_dir)
const test_dist_dir = join(repo_root, 'app', '.test-dist')
rmSync(test_dist_dir, { force: true, recursive: true })
mkdirSync(test_dist_dir, { recursive: true })

execFileSync(
  'cmd.exe',
  [
    '/c',
    'app\\node_modules\\.bin\\tsc.cmd',
    '--outDir',
    'app\\.test-dist',
    '--module',
    'commonjs',
    '--moduleResolution',
    'node',
    '--target',
    'ES2020',
    '--resolveJsonModule',
    '--esModuleInterop',
    '--allowSyntheticDefaultImports',
    'app\\src\\utils\\result_panel.ts',
    'app\\src\\utils\\tarotReading.ts',
    'app\\src\\stores\\tarot.ts'
  ],
  {
    cwd: repo_root,
    stdio: 'inherit'
  }
)

const unit_test_files = readdirSync(join(repo_root, 'app', 'test'))
  .filter((file_name) => file_name.endsWith('.test.mjs'))
  .map((file_name) => join(repo_root, 'app', 'test', file_name))

for (const unit_test_file of unit_test_files) {
  execFileSync(process.execPath, [unit_test_file], {
    cwd: repo_root,
    stdio: 'inherit'
  })
}

rmSync(test_dist_dir, { force: true, recursive: true })
