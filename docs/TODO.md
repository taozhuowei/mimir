# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

落地 [rem 自适应布局方案](./research/layout_final_rem.md)：开发者按 iPhone 14 Pro Max（430×932）设计稿写 px，PostCSS 自动转 rem，自研 lib-flexible 按视口宽度计算 root font-size（单轴宽度公式 + 上下限钳制），实现「14PM 之上停止放大、之下等比缩、iPhone 8 以下兜底滚动 + banner 提示」。

## 禁止项（决策冻结）

1. 每步独立单 commit，验收套件 = `vue-tsc(app)` + `tsc(server)` + `vitest(app)` + `vitest(server)` + `node scripts/quality_gate.js full` + `node scripts/build/index.js --prod --target h5,server --skip-quality`（DONE+perfΔ≈0） + `npx playwright test`（运行时/布局/动画类步骤必跑，纯文档/配置类可跳并说明）。
2. 禁 `--no-verify`/任何门禁绕过；前端类型检查用 vue-tsc；vitest 必带 `--dir`。
3. mp-weixin 端本期不动，保持现状；同一份 .vue 源码在 mp 端按物理 px 渲染，跨端视觉差为已认可技术债。
4. baseline 与 floor 由 [layout_final_rem.md](./research/layout_final_rem.md) 锁定，落地中不再调整数值；如要调整须先更新方案档并取得方向。

## 任务清单

- [ ] N1 引入 postcss-pxtorem + 配置（基础设施）：装 `postcss-pxtorem` 到 `app/devDependencies`；vite.config.ts 注入 `css.postcss.plugins`：`rootValue=43`、`propList=['*','!border','!border-*']`、`minPixelValue=2`、`unitPrecision=5`、`mediaQuery=false`、`selectorBlackList` 含 `.ignore-rem` 与 `:root`（避免根级 var 被转）。零运行时（postcss-pxtorem 仅编译期），但产物变化大，提交后 prod build + e2e 兜底跑一遍。
- [ ] N2 自研 design_flexible（< 30 行 JS）+ FOUC 注入：新增 [`app/src/core/sizing/design_flexible.ts`](../app/src/core/sizing/design_flexible.ts)：导出 `setup(): void` 与 `isTooSmall: Ref<boolean>`、`scale: Ref<number>`；公式 `scale = clamp(0.872, w/430, 1)`、`rootFontSize = 43 × scale`；监听 `resize/orientationchange`，rAF 节流，dimension diff 短路；too-small 判定 `w<375`。同步 [`app/index.html`](../app/index.html) 入口模板把 setup 调用 inline 到 `<head>` 顶部 blocking 执行（FOUC 防护）。单测覆盖公式数学。
- [ ] N3 新增 dpx() runtime helper + 改造 GSAP/style_sync px 拼接：新增 [`app/src/core/sizing/dpx.ts`](../app/src/core/sizing/dpx.ts)：导出 `dpx(n: number): number` 与 `dpxStr(n: number): string`；实现 `n × currentRootFontSize / 43`。全项目搜 GSAP / animation / `${x}px` 字符串拼装路径（已知点：[`style_sync.ts`](../app/src/flows/shared/composables/animations/style_sync.ts) `:51,58,72`、[`flip.ts`](../app/src/flows/shared/composables/animations/flip.ts)、[`grow.ts`](../app/src/flows/shared/composables/animations/grow.ts)），统一改用 dpx() 桥；新增 ESLint 规则禁裸 `\d+px` 字面量出现在 .ts 字符串里。
- [ ] N4 baseline 抽出为 design_baseline.ts（事实层）：把 [`scale_constants.ts`](../app/src/core/sizing/scale_constants.ts) 已有 11 个 `BASELINE_*` 常量抽出为 [`app/src/core/sizing/design_baseline.ts`](../app/src/core/sizing/design_baseline.ts) 嵌套树（`viewport / floor / header / card / answer / action / spacing`），命名规范 + TS `as const` 导出；layout_solver 系列改读新 baseline；scale_constants 退化为重导出兼容层。零功能改动，纯结构。
- [ ] N5 重构布局为 flex 三段（行为改动，需 e2e 兜底）：[`MainSurface.vue`](../app/src/flows/index/components/MainSurface.vue) play-view 改 flex 列：HeaderArea + content-area（stage flex + answer flex），废弃 `--result-card-lift-y`、answer-zone 解除 `position:absolute`、卡牌严格 flex 居中；[`StageDeck.vue`](../app/src/flows/index/components/StageDeck.vue) 删 `resultCardLiftY` 计算；[`DeckRig.vue`](../app/src/flows/divination/components/DeckRig.vue) 删 lift transform 与 `.deck-rig--show-results` 修饰。Playwright 五档视口（360/375/430/768/1280）截图基线对比，确认卡居中 + 答案紧贴下方 + 无滚动。
- [ ] N6 业务组件 px 数值校准（按 14PM 设计稿真值改写）：[`AnswerInscription.vue`](../app/src/flows/answer/components/AnswerInscription.vue) 三段字号/间距按设计稿真值改 px（quote 26px、translation 16px、source 12px、padding/margin 同），删 `var(--text-*)` 与 `var(--space-*)` 引用；[`HeaderArea.vue`](../app/src/flows/shared/components/HeaderArea.vue)、[`ActionArea.vue`](../app/src/flows/answer/components/ActionArea.vue)、[`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue) 同步校准。
- [ ] N7 global.css 清理 + TooSmallBanner：删 [`global.css`](../app/src/core/styles/global.css) 中 `--text-*`/`--space-*`/`--header-height` 等 token 段（postcss-pxtorem 接管 px）；保留色板与动画 keyframes；body 默认 `overflow:hidden`，`body.too-small` 切换 `overflow:auto`；新增 [`TooSmallBanner.vue`](../app/src/flows/shared/components/TooSmallBanner.vue)：监听 `design_flexible.isTooSmall`，显示「屏幕过小，显示效果可能受影响」。
- [ ] N8 调整 viewport_smoke e2e + 多视口重截基线：[`viewport_smoke.spec.ts`](../app/test/e2e/viewport_smoke.spec.ts) 新增 `expectedScale(w) = clamp(0.872, w/430, 1)` helper；`MAX_CARD_WIDTH` 断言改为 `≈ 240 × expectedScale(w)`；新增 too-small banner 可见性断言（360 视口）；五档视口（360/375/430/768/1280）重截 home-/result- 基线图。
- [ ] N9 stylelint 守护 baseline 白名单：新增 stylelint 自定义规则或 `declaration-property-value-allowed-list`，禁止 `font-size / margin / padding / width / height` 等使用 baseline 之外的 px 字面量；集成到 [`quality_gate.js`](../scripts/quality_gate.js) full / staged 两路径。
- [ ] N10 清理旧 token 与死代码：删 [`scale_constants.ts`](../app/src/core/sizing/scale_constants.ts) 中已迁移常量（保留极少数运行时仍需的）；删 [`layout_solver_answer.ts`](../app/src/core/sizing/layout_solver_answer.ts) 中 `INITIAL_DRAWER_HEIGHT_RATIO` 等死参数（pivot 后已失语义）；删 [`style_sync.ts`](../app/src/flows/shared/composables/animations/style_sync.ts) 中按 viewport 分发的 lift 计算；[`use_css_var_bridge.ts`](../app/src/core/sizing/use_css_var_bridge.ts) 中过时 var 注入清理；死 import / 死类型清扫。
- [ ] N11 全套门禁 + 提交收尾：N1-N10 每步独立 commit；最后整体重跑 `quality_gate.js full` + 五档 e2e + prod build；docs/TODO.md 标完成；docs/research/ 三档保留作为决策追溯。

## 回滚

每步未提交：`git checkout -- .`（+ 还原任何 `git mv`）。已提交：对对应步 `git revert`（各步独立 commit，可分别回退）。N5（布局改动）回滚需同步 e2e 基线图。

## 进度

待启动。N1（PostCSS 引入）正在准备中。

## 搁置问题（已登记，未排期）

1. mp-weixin 端 px 语义割裂：H5 经 postcss-pxtorem 自动缩，mp 端按物理 px 渲染。本期不补；若后续要补，引入 postcss-pxtorpx 转换链，公式 `mp_rpx = h5_px × 750 / 430`，开发者源码不变。
2. 用户浏览器字号放大（WCAG 1.4.4）：rem 方案天然支持 user font-size，但 lib-flexible 会覆盖 root font-size，二者打架。本期默认覆盖（与业内 H5 项目一致），无障碍合规不在本期范围。
3. 早期提交 `b5f7d9f` 的 commitlint `footer-leading-blank` ⚠：非阻塞历史小瑕疵，已权衡决定不处理。
