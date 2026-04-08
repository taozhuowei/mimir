import { defineConfig } from 'vitest/config'

// Standalone test project config.
// Covers both frontend util unit tests and backend/API integration tests.
// All tests run in Node.js environment — none require DOM APIs.
export default defineConfig({
  cacheDir: '../node_modules/.vite/vitest',
  test: {
    environment: 'node',
    include: ['*.{test,spec}.ts', 'testcases/*.{test,spec}.ts'],
  },
})
