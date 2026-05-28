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

// H5 端：源码按 iPhone 14 Pro Max (430×932 CSS px) 设计稿写 px，
// postcss-pxtorem 编译期把每个 px 转 rem；运行时 lib-flexible
// (app/src/core/sizing/design_flexible.ts) 按视口宽度写 root font-size
// 驱动全局缩放。rootValue=43 = 430/10。propList 排除：
//   - border / box-shadow / outline：保持物理 1 px 细线
//   - font-size / line-height / letter-spacing：交由 sizes CSS 变量
//     桥统一管理（避免与 PostCSS 链叠加产生 ±15% 偏差）
const isH5Target = !process.env.UNI_PLATFORM || process.env.UNI_PLATFORM === 'h5'

// mp-weixin 对端：源码同样按 430 设计画布写 px，rpx 定义为 screenWidth/750，
// 故 N design-px = N × 750/430 rpx，渲染为 N × (w/430) px，与 H5 rem 链等价。
// 排除项 / minPixelValue / 黑名单 (:root + .ignore-rem) 与 H5 完全镜像，
// 字号 / 行高 / 字距同样跳过转换、交由 CSS 变量桥接管。
function postcssPxToRpx({ ratio = 750 / 430, unitPrecision = 5, minPixelValue = 2 } = {}) {
  const excludeProp = /^(border|border-.+|box-shadow|outline|outline-.+|font-size|line-height|letter-spacing)$/
  const blacklist = [/(^|[^.\w-]):root\b/, /\.ignore-rem/]
  const pxValue = /(-?\d*\.?\d+)px/g
  return {
    postcssPlugin: 'postcss-pxtorpx-local',
    Declaration(decl: { prop: string; value: string; parent?: { selector?: string } }) {
      if (!decl.value.includes('px') || excludeProp.test(decl.prop)) return
      const selector = decl.parent && decl.parent.selector
      if (selector && blacklist.some((re) => re.test(selector))) return
      decl.value = decl.value.replace(pxValue, (match: string, num: string) => {
        const n = parseFloat(num)
        if (!Number.isFinite(n) || Math.abs(n) < minPixelValue) return match
        return `${+(n * ratio).toFixed(unitPrecision)}rpx`
      })
    },
  }
}
postcssPxToRpx.postcss = true

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    publicDir: path.resolve(__dirname, '../server/public'),
    plugins: [uni()],
    envDir: path.resolve(__dirname, '../..'),
    css: isH5Target
      ? {
          postcss: {
            plugins: [
              postcssPxtorem({
                rootValue: 43,
                unitPrecision: 5,
                propList: [
                  '*',
                  '!border',
                  '!border-*',
                  '!box-shadow',
                  '!outline',
                  '!outline-*',
                  '!font-size',
                  '!line-height',
                  '!letter-spacing',
                ],
                selectorBlackList: [':root', /\.ignore-rem/],
                replace: true,
                mediaQuery: false,
                minPixelValue: 2,
              }),
            ],
          },
        }
      : {
          postcss: {
            plugins: [postcssPxToRpx({ ratio: 750 / 430, unitPrecision: 5, minPixelValue: 2 })],
          },
        },
    resolve: {
      alias: {
        // Use gsap-core (no CSSPlugin) to avoid DOM-only APIs in WeChat Mini Program.
        gsap: path.resolve(__dirname, '../../node_modules/gsap/gsap-core.js'),
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
