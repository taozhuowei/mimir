import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const current_file_path = fileURLToPath(import.meta.url)
const tools_dir = dirname(current_file_path)
const repo_root = dirname(tools_dir)
const app_dir = join(repo_root, 'app')
const suite_name = process.argv[2]

const test_files = {
  integration: [join(repo_root, 'app', 'test', 'result_panel.integration.mjs')],
  e2e: [join(repo_root, 'app', 'test', 'divination_flow.e2e.mjs')]
}

if (!suite_name || !test_files[suite_name]) {
  throw new Error(`Unsupported browser suite: ${suite_name ?? '<missing>'}`)
}

const dev_process = spawn(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/c', 'npm', 'run', 'dev:h5'] : ['run', 'dev:h5'], {
  cwd: app_dir,
  env: {
    ...process.env,
    FORCE_COLOR: '0'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

const output_buffer = []
let base_url = ''
let has_exited = false

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '')
}

function collectOutput(chunk) {
  const text = stripAnsi(chunk.toString())
  output_buffer.push(text)

  if (!base_url) {
    const match = text.match(/http:\/\/localhost:\d+\//)
    if (match) {
      base_url = match[0]
    }
  }
}

dev_process.stdout.on('data', collectOutput)
dev_process.stderr.on('data', collectOutput)
dev_process.on('exit', () => {
  has_exited = true
})

async function waitForServer() {
  const started_at = Date.now()

  while (!base_url) {
    if (has_exited) {
      throw new Error(`dev:h5 exited before reporting a URL.\n${output_buffer.join('')}`)
    }

    if (Date.now() - started_at > 60000) {
      throw new Error(`Timed out waiting for dev:h5.\n${output_buffer.join('')}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  const health_started_at = Date.now()

  while (true) {
    try {
      const response = await fetch(base_url)
      if (response.ok) {
        return
      }
    } catch {
      // Server is still starting.
    }

    if (Date.now() - health_started_at > 60000) {
      throw new Error(`Timed out waiting for ${base_url}.\n${output_buffer.join('')}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

async function stopServer() {
  if (dev_process.killed || dev_process.exitCode !== null) {
    return
  }

  if (process.platform === 'win32') {
    const taskkill = spawn('taskkill', ['/PID', String(dev_process.pid), '/T', '/F'], {
      stdio: 'ignore'
    })

    await new Promise((resolve) => taskkill.on('exit', resolve))
    return
  }

  dev_process.kill('SIGTERM')
  await new Promise((resolve) => dev_process.on('exit', resolve))
}

try {
  await access(join(app_dir, 'node_modules', 'playwright'))
  await waitForServer()

  for (const test_file of test_files[suite_name]) {
    const child = spawn(process.execPath, [test_file], {
      cwd: repo_root,
      env: {
        ...process.env,
        TEST_BASE_URL: base_url
      },
      stdio: 'inherit'
    })

    const exit_code = await new Promise((resolve) => child.on('exit', resolve))
    assert.equal(exit_code, 0, `${test_file} failed with exit code ${exit_code}`)
  }
} finally {
  await stopServer()
}
