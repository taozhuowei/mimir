import { defineConfig } from 'vitest/config'

// Standalone test project config.
// Runs pure TS unit tests against app/src without the uni-app vite plugin chain
// (which conflicts with vitest's bundled vite 8.x).
export default defineConfig({
  cacheDir: '../node_modules/.vite/vitest',
  test: {
    environment: 'jsdom',
    include: ['*.{test,spec}.ts'],
  },
})
