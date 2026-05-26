import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Isolate from the frontend vitest run that otherwise shares the repo-root
  // node_modules/.vite cache during parallel `quality_gate full` (see frontend config).
  cacheDir: 'node_modules/.vite/vitest-server',
  test: {
    environment: 'node',
    globals: true,
    include: ['*.test.ts'],
    pool: 'vmThreads',
    execArgv: ['--experimental-vm-modules'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
  },
})
