# app

uni-app + Vue 3 前端，单产物双端：H5（主交付）与 mp-weixin（小程序，验证中）。承载塔罗体验的全部界面、动画与状态流，后端接口经 `src/core/api` 访问。

## 目录结构（app 层）

`src/` 内部结构见 [src/README.md](src/README.md)。

```
app/
├── src/                  全部源码（见 src/README.md）
├── test/                 前端单元/组件测试（vitest + @vue/test-utils，jsdom），用例 *.test.ts
├── index.html            H5 入口 HTML，注入 viewport，引导 /src/main.ts
├── vite.config.ts        vite + vite-plugin-uni 构建配置：publicDir 指向后端 public、dev :4123 代理 /api·/static→:4124、prod terser 压缩
├── vitest.config.ts      vitest 配置（jsdom），注册 uni 内置标签为自定义元素
├── tsconfig.json         前端 TypeScript 配置（strict，@/* → src/*）
├── shims-uni.d.ts        为 Vue 组件补充 uni-app 生命周期钩子类型
├── package.json          占位（无脚本，yarn 脚本在仓库根）
└── node_modules/         依赖
```

入口链：`index.html` → `src/main.ts` → `src/App.vue` → `src/pages/index.vue`。

## 技术栈

- **uni-app**（`@dcloudio/uni-*`）+ **Vue 3.4**：H5 + mp-weixin 双产物。
- **Pinia**：状态管理（`src/core/store/`）。
- **GSAP**：动画引擎，封装于 `src/core/gsap/`，自研相位/播放引擎在 `src/flows/shared/composables/animations/`。
- **vite** + `vite-plugin-uni`：H5 dev server 与双端构建。
- **vitest** + `@vue/test-utils`（jsdom）：单元与组件测试。
- **vue-tsc**：前端类型检查。
