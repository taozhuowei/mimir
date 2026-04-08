import { defineConfig } from 'vitest/config'

// Standalone vitest config for running app/test/** without the full uni-app
// vite plugin chain (which requires vite 5.x and conflicts with vitest's
// bundled vite 8.x).  The tests are pure TypeScript unit tests that do not
// depend on Vue SFC compilation or uni-app runtime.
export default defineConfig({
  test: {
    environment: 'jsdom',
    root: 'app',
    include: ['test/**/*.{test,spec}.ts'],
    cache: { dir: '../node_modules/.vite/vitest' },
  },
  resolve: {
    alias: {
      // Provide a stub for uni global used in source files under test
    },
  },
})
