import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [uni()],
    envDir: path.resolve(__dirname, '..'),
    resolve: {
      alias: {
        // Use gsap-core (no CSSPlugin) to avoid DOM-only APIs in WeChat Mini Program.
        gsap: path.resolve(__dirname, '../node_modules/gsap/gsap-core.js'),
      },
    },
    build: {
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      cssMinify: isProduction,
      reportCompressedSize: isProduction,
      terserOptions: isProduction
        ? {
            compress: {
              passes: 2,
              drop_console: true,
              drop_debugger: true,
            },
            mangle: {
              safari10: true,
            },
            format: {
              comments: false,
            },
          }
        : undefined,
    },
  }
})
