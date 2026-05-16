# app

uni-app + Vue 3 前端，单产物双端：H5（主交付）与 mp-weixin（小程序，验证中）。承载塔罗体验的全部界面、动画与状态流；后端接口经 `core/http` 访问，路由由 `pages.json` 驱动（非 vue-router）。

## 目录架构

```
app/
├── src/                  # 源码(分层见下)
├── test/                 # 前端测试(vitest 单元/组件,jsdom)
│   └── e2e/              # playwright 端到端用例
├── index.html
├── vite.config.ts        # vite + vite-plugin-uni(仅 gsap 别名,无 @ 别名)
├── vitest.config.ts
├── playwright.config.ts  # webServer.cwd 解析到仓库根
├── tsconfig.json
├── shims-uni.d.ts
└── package.json
```

`src/` 按职责分层：

- `core/`（底层/框架/库领域核心，不依赖 `state`/`shared`）：`animation`（GSAP 适配 + 自研相位引擎 + `use_animation_state`/`use_playback`）、`api`、`deck`、`flow`（含 `pipeline_shared_deps` DI 契约）、`sizing`（响应式求解 + `use_css_var_bridge` + `overlay_layout/` 视口/场景/运动几何）、`config`、`utils`。
- `state/`（占卜业务编排）：相位生命周期与播放编排（`use_overlay`/`use_animation_controller`/`use_lifecycle`/`use_phases`/`use_app_phase`/`use_active_view`/`use_reading_controller` 等）、`commands/`（管道命令）、`play/`（牌堆交互子控制器）、`shared/`（跨组件复用的 UI 逻辑，如 `use_reading_panel_controller`）。**当前为旧 `composables/` 按职责收敛后的过渡落点；深度状态机垂直拆分（`state_controller`/`*_flow`/`phase`/`task`）后置，非终态。**
- `tools/`（开发期工具）：`use_dev_tools` 等，仅开发构建启用。
- `shared/`（跨页面共享）：`components`/`store`/`views`。
- `pages/`（`main` 主页面 + `fallback` 兜底页，由 `pages.json` 驱动）。
- `styles/`（含 `overlay` 叠层样式）。

入口 `main.ts`（`createSSRApp`）+ `App.vue`。

## 技术栈

- **uni-app**（`@dcloudio/uni-*`）+ **Vue 3.4**：`main.ts` 用 `createSSRApp`（uni-app 约定，非 vanilla `createApp`）；H5 + mp-weixin 双产物。
- **Pinia**：全部状态管理。
- **GSAP**：动画引擎，封装于 `core/animation/adapters/`；自研相位引擎在 `core/animation/`。
- **vite** + `vite-plugin-uni`：H5 dev server / 双端构建。
- **vitest** + `@vue/test-utils`（jsdom）：纯逻辑与组件单测。
- **playwright**：H5 端到端。
- **vue-tsc**：前端类型检查（必须用 `vue-tsc`，普通 `tsc` 漏 SFC 级错误）。
