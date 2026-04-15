import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'
import fs from 'fs'

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  // The mp-weixin build of vite-plugin-uni only bundles assets that are referenced
  // through `import` statements. Card backs and icons must ship inside the package
  // so the mini program works on a real device that cannot reach the dev server,
  // so we copy `app/src/static/` into the package output ourselves.
  const isMp = (process.env.UNI_PLATFORM ?? '').startsWith('mp-')
  const staticCopyPlugin = isMp ? {
    name: 'scales-tarot-copy-static',
    apply: 'build' as const,
    closeBundle() {
      const inputDir = process.env.UNI_INPUT_DIR
      const outputDir = process.env.UNI_OUTPUT_DIR
      if (!inputDir || !outputDir) return
      const src = path.join(inputDir, 'static')
      if (!fs.existsSync(src)) return
      copyDir(src, path.join(outputDir, 'static'))
    },
  } : null

  return {
    plugins: [uni(), ...(staticCopyPlugin ? [staticCopyPlugin] : [])],
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
  }
})
