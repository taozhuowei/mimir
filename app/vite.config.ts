import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import postcssPxtorem from 'postcss-pxtorem'
import path from 'path'

// Defensive: pin UNI_INPUT_DIR to this config's directory so tools that load
// vite.config.ts from a different cwd (e.g. knip running from the repo root)
// don't fail with ENOENT on src/manifest.json. uni()'s initEnv defaults this
// to `path.resolve(process.cwd(), 'src')`, which only works when cwd === app/.
if (!process.env.UNI_INPUT_DIR) {
  process.env.UNI_INPUT_DIR = path.resolve(__dirname, 'src')
}

// H5 only: source code is authored against the iPhone 14 Pro Max design draft
// (430x932 CSS px). postcss-pxtorem converts every px declaration to rem at
// build time so the runtime lib-flexible (app/src/core/sizing/design_flexible.ts)
// can drive the global scale by writing a single root font-size. rootValue=43
// is `design_baseline.viewport.w / 10`; propList excludes border/box-shadow so
// hairlines stay physical 1px regardless of viewport. mp-weixin targets do not
// go through vite's CSS pipeline (uni-cli has its own); we still gate the
// plugin on UNI_PLATFORM to make intent explicit and survive future toolchain
// shuffles. See docs/research/layout_final_rem.md for the full rationale.
const isH5Target = !process.env.UNI_PLATFORM || process.env.UNI_PLATFORM === 'h5'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    publicDir: path.resolve(__dirname, '../server/public'),
    plugins: [uni()],
    envDir: path.resolve(__dirname, '..'),
    css: isH5Target
      ? {
          postcss: {
            plugins: [
              postcssPxtorem({
                rootValue: 43,
                unitPrecision: 5,
                propList: ['*', '!border', '!border-*', '!box-shadow', '!outline', '!outline-*'],
                selectorBlackList: [':root', /\.ignore-rem/],
                replace: true,
                mediaQuery: false,
                minPixelValue: 2,
              }),
            ],
          },
        }
      : undefined,
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
      // Skip gzip-size reporting even in prod — it adds 1–3s to CI for no
      // operational benefit; we care about bytes on disk, which are already
      // logged by vite's regular output.
      reportCompressedSize: false,
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
    server: {
      host: '0.0.0.0',
      port: 4123,
      proxy: {
        '/static': 'http://localhost:4124',
        '/api': 'http://localhost:4124',
      },
    },
  }
})
