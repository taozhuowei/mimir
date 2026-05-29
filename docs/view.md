# 视图与视觉层

## 三层抽象

1. 视图：逻辑页面。
2. 容器：视图内的位置盒子。
3. 内容：容器内的文字或动画。

例如：待机视图是一个逻辑页面，里面“扇形展开的牌堆”是一个动画（内容），动画播放在“待机视图的舞台”容器里——位置和动画解耦。

---

## 4 个视图与所属容器

1. 待机视图：标题区 + 舞台
2. 占卜视图：流程进度区 + 舞台
3. 结果视图：占卜舞台（结果卡定格并上移）+ 其正下方行内答案卡 + 操作区；不分栏、不侧栏、不抽屉，全宽统一
4. 加载视图：标题区 + 舞台（加载与启动失败常驻态共用同一视图）

---

## 容器与内容对应

1. 标题区：文字（主标题 / 副标题 / 引导文字；加载视图为单行加载提示“正在接通星辰”，失败常驻态文案不变，错误明细经顶部通知告知）
2. 舞台：动画（待机视图播放摊牌动画；占卜视图播放洗牌、切牌、抽牌、翻牌；加载视图播放加载动画）
3. 流程进度区：四个图标对应占卜内动画相位（洗牌 / 切牌 / 抽牌 / 翻牌），随占卜阶段内动画推进逐个高亮。不对应应用级流程阶段。
4. 答案卡（AnswerCard）：占卜视图结果卡牌正下方的行内区域（本身即唯一可见容器，无外包装；min-height 由 `--answer-zone-min-height` 兜底，上限约屏高 50%，底部贴齐、内部可滚），自持加载 / 错误 / 成功三态；加载态文案“正在揭示答案...”，错误态走通知与重试分支，成功态呈现一句名句的原文（大标题）、翻译（小标题）、来源（以「——」开头，更小、斜体、置灰），整体居中限宽，分段 rise-in 入场
5. 操作区：再占一次 / 重试 / 回到首页 等按钮（仅决策阶段出现）
6. 通知：错误提示文字（跨视图全局，运行时异常时浮现）

---

## 功能需求：待机视图

- 展示产品标题与副标题
- 提供明确的触发占卜入口（点击舞台进入占卜）
- 提供牌阵选择入口
- 在资源加载失败时，加载视图保持原样不变，通过顶部通知（非阻塞）给出清晰的错误明细提示

## 功能需求：牌阵选择

- 当前版本仅开放单张牌阵（single_card）
- 默认状态下可直接进行单张牌阵占卜
- 多牌阵尚未实现；未来引入时需要在协议（`/divinations` 请求体的 `spreadKind` 枚举）、布局求解器（`SpreadKind` 类型与求解策略）和 UI 入口三处一起扩展

## 功能需求：答案展示

- 在占卜视图结果卡牌正下方的行内答案卡内展示，全宽统一，无分栏 / 抽屉
- 答案卡按本次抽到的卡牌及其正逆位，展示一句名句的原文、翻译与来源三部分
- 长文本应保持可读，不因内容长度导致答案卡不可用
- 用户应能明确执行再占一次操作

## 功能需求：可访问性与可用性

- 关键操作必须具备清晰可见的入口
- 关键内容必须可被辅助阅读工具识别
- 移动端主要交互目标需保持足够触控面积
- 常见屏幕尺寸下不应出现明显遮挡、错位和跳变

---

## 交互原则

- 尽量减少不必要步骤
- 给用户明确反馈，不让用户猜系统是否还在工作
- 错误恢复路径必须简单、直接
- 结果视图要兼顾首屏重点信息和完整阅读体验

---

## 响应式设计

### 画布与缩放

1. 设计基线机型：iPhone 14 Pro Max（逻辑宽 430px，记 `REF_DESIGN_CANVAS_WIDTH`）。所有 px 设计稿数值按此机型书写
2. 兼容下限：iPhone 8（逻辑宽 375px，记 `MIN_CANVAS_WIDTH`）。小于 375px 的视口仍按 375 画布渲染并显示 too-small 提示，不强行适配
3. 上限：iPhone 17 Pro Max（逻辑宽 440px，记 `MAX_CANVAS_WIDTH`）。超出此宽度的视口（iPad / 桌面）画布锁 440 居中显示，两侧留空
4. 缩放系数 `k = canvasWidth / MIN_CANVAS_WIDTH`，落在 `[1.0, 440/375 ≈ 1.173]`。所有以 px 表达的设计 token（margin / gap / 字号 / 容器盒高）均在 `deriveSizes` 中以 `Math.round(BASELINE_* × k)` 等比缩放
5. 来源于设计稿的常量（如 answer 卡 min-height）以 14PM 为参考、反推到 iP8 baseline：`BASELINE = Math.round(DESIGN_AT_14PM × MIN_CANVAS_WIDTH / REF_DESIGN_CANVAS_WIDTH)`，运行时再乘 k 还原回当前机型实际值。这种"设计原值留在代码里"的写法避免日后改设计稿时反复换算

### 关键尺寸

1. 答案卡 min-height：14PM 设计值 160px，反推 iP8 baseline 140px，运行时按 k 缩放暴露为 `sizes.answerZoneMinHeight` 与 CSS 变量 `--answer-zone-min-height`。同一常量同时被 layout solver 当作 stage 下方最坏情况预留
2. 结果卡牌：`width = stage.width × 0.9`、`height = stage.height × 0.9`，stage 自身已扣掉答案卡 min-height + 操作区高度，故卡牌完全跟随 stage 联动——改答案卡 min-height、操作区高度或画布宽，卡牌自动重算，不需要单独维护硬上限
3. stage：`max-1:1.6 rect` 装在 `(canvas − 2×margin) × (viewport − safeArea − header − 2×margin − bottomReservation)` 里，bottomReservation 仅在 answer 场景生效

### 不变量

1. 同一视口下，CSS 变量、layout solver 预留、DOM 实际盒高三者同源，避免 stage 求解与渲染对不上
2. 内容罕见超出 min-height 时，由 flex 在运行时进一步压 stage，求解器维持保守预留即可，不需追加自适应逻辑

---

## 首屏加载架构（App Shell 双层）

H5 首屏走 Google App Shell 模型，把"出现可见画面"和"Vue 应用接管"拆成两层串行，避免 Vue 入口 JS 下载完之前 `<div id="app">` 为空白屏。两层视觉同源（同色、同几何、同 accent），用户感知不到接替点。

### Layer 1 — HTML 静态骨架

- 位置：`app/frontend/index.html` 的 `<head><style data-skeleton>` + `<body><div id="app">` 内嵌 `.boot-skeleton` DOM
- 形态：纯 HTML + CSS keyframes，**零网络往返、零外部资源；仅含 rem 兜底 inline JS（`design_flexible`，跑在 `<head>` 内，无外链）**；HTML 解析完即可绘制
- 几何：4 条椭圆轨道 (rx 80/120/165/210 × ry 28/42/58/74)、4 颗行星（四面体 / 平行六面体 / 球体 / 八面体）、中央恒星，与 `flows/loading/composables/orbits.ts` 同源
- 颜色：背景 `#F7F0E0`、accent `#b8943e` 字面值内联（同 `core/styles/global.css :root` 的 `--color-bg-page` / `--color-accent`），先于外部样式表绘制
- 文案：无（避免 Layer 2 的 `TitleContent` 上来时 FOUT）
- 选择器：每条规则前缀 `.ignore-rem`，命中 `vite.config.ts` 的 postcss-pxtorem / pxtorpx selectorBlackList，保留字面 `px`

### Layer 2 — Vue LoadingView

- 位置：`flows/loading/components/LoadingView.vue` + `LoadingOrbits.vue`（不变）
- 接替时机：`createSSRApp(App).mount('#app')` 自然清空 `#app` 子树后，由 `pages/index.vue` 依据 boot status 在 `LoadingView` ↔ `MainSurface` 之间切换

### 交接点

- Layer 1 的 `.boot-skeleton` 元素被 Vue 挂载时整体替换，无显式 unmount 逻辑
- 两层共用 `:root` CSS 变量（`--color-bg-page` / `--color-accent` / `--color-accent-raw`）；Layer 1 内联字面值确保 global.css 抵达前不出错，到达后 Layer 2 接住同名变量
- 几何参数手动同步：Layer 1 的 px 与 `orbits.ts` 中 `createDefaultPlanets()` 一致；周期是 `2π / speed` 的整秒近似（12 / 17 / 23 / 35 s），Layer 2 接管前不会跑出可见偏移

### 为什么 Layer 1 脱离 Vue

- Vue 入口 chunk + 路由 chunk 串行下载 ≈ 3.8 s（实测）；让首帧依赖它意味着 FCP ≥ 3.8 s
- 入口 CSS 被 `critical-css-inline` 内联进 `<head>`，HTML 一到就能绘制；Layer 1 在 HTML 解析时即可可见，FCP 降至 ≈ 1.7 s
- 同时入口 JS 通过 `manualChunks` 把 `/src/pages/` `/src/flows/` `/src/core/` 同步依赖合入单个 `index.*.js`，消除二段下载，Vue Layer 2 ≈ 3 s 上屏
