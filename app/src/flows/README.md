# flows

按应用三视图（待机 idle / 占卜 divination / 解读 reading）归类的视图与组件。每个 flow 的视图组件放在 `<flow>/views/`，flow 内逻辑放在 `<flow>/composables/`。跨 flow 复用件放 [`shared/`](./shared/)；兜底路由是独立体验，不属任何 flow，放同级 [`../fallback/`](../fallback/)。目录即语义，组件命名与内部逻辑保持迁移前不变。

## idle/views — 待机视图专属

- [`DeckFanStack.vue`](./idle/views/DeckFanStack.vue) — idle 态扇形 12 牌堆与底部触摸提示，全部由 props 驱动、无内部状态。

## divination/views — 占卜视图专属

- [`DeckRig.vue`](./divination/views/DeckRig.vue) — 占卜 GSAP 牌阵（初始堆 / 洗牌两半 / 切牌堆 / 3D 翻牌），绑定传入的 animationController 渲染。
- [`ProgressContent.vue`](./divination/views/ProgressContent.vue) — 占卜视图的 4 阶段进度图标行，数据来自注入的 animationController。

## reading/views — 解读视图专属

- [`ReadingSplitView.vue`](./reading/views/ReadingSplitView.vue) — 宽屏解读分栏视图，从右外侧滑入右半屏。
- [`ReadingDrawerView.vue`](./reading/views/ReadingDrawerView.vue) — 窄屏解读抽屉视图，从底部弹出，高度上限至结果卡牌底部，可拖动。
- [`ReadingPanel.vue`](./reading/views/ReadingPanel.vue) — 组合结论 / 卡牌 / 解读三子容器，处理 loading / error / success 三态与过渡；split 与 drawer 共用。
- [`ConclusionContainer.vue`](./reading/views/ConclusionContainer.vue) — 结论倾向文案（正 / 负 / 中）与 tone 配色，打字机时序本地化。
- [`CardMeaningContainer.vue`](./reading/views/CardMeaningContainer.vue) — 每张牌的名 / 英文名 / 正逆位 / 阿卡纳 / 关键词（无牌面图），逐字段打字机时序。
- [`ReadingTextContainer.vue`](./reading/views/ReadingTextContainer.vue) — 逐卡解读文字打字机渲染，全部呈现完成后发出完成事件以推进应用相位。
- [`TypewriterText.vue`](./reading/views/TypewriterText.vue) — 文本逐字打字机呈现，封装打字机模型生命周期，`prefers-reduced-motion` 时直出全文；被上述三容器复用的底层件。
- [`ActionArea.vue`](./reading/views/ActionArea.vue) — decision 阶段「回到首页 / 再占一次」按钮与读取失败「重试」按钮，内置可见性规则，emit 语义动作；仅在解读两视图内渲染。

## shared — 跨 flow / 非 flow 复用

- [`PlayView.vue`](./shared/PlayView.vue) — task 8.2.3 统一视图，始终挂载，靠 CSS 状态切换承载 idle ↔ divination；待后续拆回独立 idle / divination 视图。
- [`Stage.vue`](./shared/Stage.vue) — idle / divination / fallback 三场景的纯居中 slot 外壳，仅附加 `stage--{scene}` 类，不持有动画状态。
- [`Deck.vue`](./shared/Deck.vue) — 统一牌堆装配件：组装 `DeckFanStack`（idle）与 `DeckRig`（divination），承担点击 / 键盘入口、结果牌上移计算与根样式注入。
- [`HeaderArea.vue`](./shared/HeaderArea.vue) — 顶部页眉的纯几何外壳，集中 margin / height / safe-area / z-index，内容经 slot 注入；自身不渲染文案。
- [`TitleContent.vue`](./shared/TitleContent.vue) — 页眉文案载荷：idle 主 / 副 / 引导（自带 GSAP 错落入场动画）、fallback 单行中性文案，含 idle 错误副行。
- [`NotificationHost.vue`](./shared/NotificationHost.vue) — 订阅通知 store，渲染跨视图通知队列并提供关闭。
- [`DevToolsPanel.vue`](./shared/DevToolsPanel.vue) — 可拖拽 / 折叠的开发浮层外壳（dev-only），承担拖拽手势、折叠态、点击与拖拽仲裁，转发各控制行事件。
- [`DevToolsCollapsedHandle.vue`](./shared/DevToolsCollapsedHandle.vue) — 折叠态 40px 圆形手柄内的闪电图标，纯视觉。
- [`DevToolsPhaseRow.vue`](./shared/DevToolsPhaseRow.vue) — 阶段重播 chips 行。
- [`DevToolsPlaybackRow.vue`](./shared/DevToolsPlaybackRow.vue) — 「跳到解读」与播放倍率 chips 行。
- [`DevToolsControlRow.vue`](./shared/DevToolsControlRow.vue) — 暂停 / 继续 / 单步控制与容器边框开关两行。

## ../fallback — 兜底路由（同级，非 flow）

- [`FallbackView.vue`](../fallback/FallbackView.vue) — 兜底路由内唯一视图，用神秘文案与几何动画提示无法连接。
- [`FallbackOrbits.vue`](../fallback/FallbackOrbits.vue) — 兜底视图的中心星与四行星 3D 轨道循环动画，无业务状态，GSAP ticker 驱动。
