import path from "path";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  // Put Vite dep cache in root node_modules to avoid app/node_modules
  cacheDir: path.resolve(__dirname, "../node_modules/.vite"),
  plugins: [uni()],
  build: {
    // 启用代码压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },
  },
});
