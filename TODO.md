# TODO — Scales Tarot 版本演进计划

> **版本经理**：技术总监代管  
> **文档更新日期**：2026-04-17  
> **当前发布范围**：阶段 A + B 已完成，准备进入阶段 C（MVP 部署与工程规范）；阶段 E 进入小程序适配。

---

## 状态定义

| 状态 | 标记 | 含义 |
|------|------|------|
| 待开发 | `[ ]` | 已拆解完毕，等待排期进入开发 |
| 开发中 | `[~]` | 已有负责人认领，正在编码或调试 |
| 待验收 | `[?]` | 功能/重构已实现，等待代码审查与测试验收 |
| 待确认 | `[!]` | 设计或方案存在分歧，需会议/文档确认后方可继续 |
| 已完成 | `[x]` | 代码已合并主分支，测试通过，文档已更新 |

---

# 阶段 A：H5 端架构重构与性能治理

**阶段目标**：彻底消除技术债务，建立单一、清晰的架构层；动画系统性能达标；布局与尺寸计算可靠且无硬编码魔法数字；所有测试自洽且覆盖边界场景。

**验收标准**：
1. `app/src/core/` 与 `app/src/utils/overlay_*` 之间不再存在 shim/适配层，调用链路扁平。
2. 不存在任何未被外部引用的死代码文件。
3. 动画在 iPhone 12/13 及千元安卓机上运行 30 秒不掉帧，无内存泄漏报警。
4. 窗口 resize、屏幕旋转、地址栏收起时卡片布局正确刷新，无抽搐。
5. 设备真实安全区（刘海、圆角、手势条）参与布局计算，无遮挡。
6. 255+ 测试全绿，且新增 10+ 边界/性能回归测试。

---

## 阶段 A 已完成任务（移至最前）

### A.1 架构清理：铲除死代码与 shim 层
- [x] 删除 `app/src/core/flow/flow_orchestrator.ts`（全局零引用）
- [x] 删除 `app/src/core/flow/phase_context_builder.ts`（全局零引用）
- [x] 删除 `app/src/core/animation/animation_engine.ts`（全局零引用，`createEngine` 无人调用）
- [x] 删除 `app/src/utils/overlay_animation/phases/` 目录下的空壳文件（`shuffle_phase.ts`、`cut_phase.ts`、`draw_phase.ts`、`reveal_phase.ts` 已仅剩初始状态或为空）
- [x] 删除 `app/src/utils/overlay_animations/`（复数 shim 目录，仅做 re-export）
- [x] 将 `utils/overlay_viewport.ts` 的计算逻辑下沉合并至 `core/viewport/safe_frame_calculator.ts`，删除原文件
- [x] 将 `utils/overlay_layout/overlay_safe_frame.ts` 的 `resultSheetBottomInset` 补丁逻辑下沉至 `core/viewport/safe_frame_calculator.ts`，删除原文件
- [x] 将 `utils/overlay_layout/card_size_solver.ts` 的转发逻辑删除，消费者直接导入 `core/sizing/card_size_solver.ts`
- [x] 将 `utils/overlay_layout/spread_registry.ts` 的转发逻辑删除，消费者直接导入 `core/layout/spread_registry.ts`
- [x] 将 `utils/overlay_layout/spread_solver.ts` 与 `built_in_layouts.ts` 合并并下沉至 `core/layout/` 统一入口，删除 `utils/` 下的重复文件

---

## 阶段 A 问题记录与发现
- [!] **代码与 TODO 冲突**：A.1.2 要求删除 `utils/spread_layout.ts`（遗留入口），但实际代码中它因被 `test/spread_layout.test.ts` 依赖而必须保留至 A.5 测试修复阶段。此任务被挂起，推迟执行。
- [!] **关键逻辑解耦检查**：已确认动画流程控制、动画序列、尺寸计算、位置计算、牌堆数量分配等逻辑已在 `core/` 和 `utils/overlay_animation/` 目录下完成充分的目录级解耦。但部分类型定义（如 `utils/overlay_animation/types.ts`）仍需进一步收敛（即 A.1.3 的剩余任务）。

---

## A.1 架构清理剩余任务

### A.1.2 扁平化 shim 层 (剩余)
- [ ] 删除 `utils/spread_layout.ts`（遗留入口），统一所有消费者至 `resolveSceneLayout`（由于测试依赖，需推迟至 A.5）

### A.1.3 统一类型定义
- [ ] 收敛 `OverlayPhase` 定义：保留 `core/flow/types.ts`，删除 `utils/overlay_animation/types.ts` 中的重复定义
- [ ] 收敛 `ShufflePhaseConfig`、`CutPhaseConfig`、`DrawPhaseConfig`：删除 `utils/overlay_animation/phases/` 中的旧定义，统一使用 `core/flow/phases/` 版本
- [ ] 统一 `SafeFrame`、`ViewportMetrics`、`CardLayout` 等核心类型的命名与字段，确保 `core/` 层与组件消费侧完全一致，不再出现 `OverlaySafeFrame` → `SafeFrame` 的手工映射

**验收点**：
- `npx eslint app/src/` 无未使用变量/导入报错（需开启 `no-unused-vars` 严格模式一次性扫描）。
- 全局搜索 `TODO: phase1 migration shim` 与 `compatibility shim` 返回 0 个结果。

---

## A.2 动画系统重构：解耦、性能、可靠性

**目标**：动画逻辑与 Vue 响应式样式刷新解耦；消除每帧字符串拼接；解决 resize 冲突与内存泄漏。

### A.2.1 解耦动画与样式刷新
- [ ] 重构 `core/flow/phases/` 下的 phase runner，**不再直接调用 `refreshXxx()` 回调**
- [ ] 在 `use_animation_state.ts` 中引入 `watchEffect` 或 `computed` 自动监听纯对象变化并同步到 style ref，替代 GSAP `onUpdate` 里的手工刷新
- [ ] `PhaseContext` 中移除 `refresh` 字段，phase runner 只接收纯数据对象与 `onComplete`

### A.2.2 性能优化
- [ ] **移除无条件 `will-change: transform`**：改为在 phase `run` 开始前后通过 CSS class（如 `.animating`）动态添加/移除 `will-change`
- [ ] 评估并实施 H5 下 GSAP 直接驱动 DOM 属性的方案（可选），若 uni-app 兼容性允许则优先直接操作 `transform` 属性而非字符串拼接
- [ ] 若必须保留字符串方案，则缓存 style string 模板，减少 `.map()` 与重复字符串拼接的 GC 压力

### A.2.3 可靠性与边界修复
- [ ] `updateLayout()` 执行前调用 `gsap.killTweensOf(_draws)`，防止 resize 与运行中 tween 冲突
- [ ] `interruptCurrentAnimation()` 增加递归清理子 timeline 实例的逻辑，确保 `onUpdate` 闭包可被 GC
- [ ] DevTools 的 `stepForward` / `stepBackward` 考虑当前 `timeScale`，步进距离修正为 `(1/60) / timeScale`
- [ ] 将 phase 状态切换从 GSAP callback 驱动改为**时间查询驱动**（根据 `masterTimeline.time()` 实时计算当前 phase），使 backward seek 能正确回退阶段状态

**验收点**：
- Chrome DevTools Performance 面板录制 30 秒动画，主线程无持续 >16ms 的长任务。
- Memory 面板录制 60 秒，JS Heap 无持续增长趋势。
- 在 DevTools 中任意拖拽时间轴或点击 step backward，phase 标记与视觉状态始终一致。

---

## A.3 布局与尺寸系统治理

**目标**：所有比例与边距集中配置；真实安全区生效；draw/result 布局一致且无硬编码。

### A.3.1 魔法数字配置化
- [ ] 新建 `app/src/core/config/layout_constants.ts`，集中存放以下常量：
  - `RESULT_NARROW_HEIGHT_FRACTION = 0.42`
  - `RESULT_WIDE_WIDTH_FRACTION = 0.44`
  - `RESULT_SHEET_FRACTION = 0.30`
  - `FOCUS_SCALE_WIDE = 1.42`
  - `FOCUS_SCALE_NARROW = 1.2`
  - `CARD_ASPECT_RATIO = 1.6`
  - 各方向 inset px、footer reserve rpx、header margin rpx 等
- [ ] 所有引用方改为从 `layout_constants.ts` 导入，禁止散落魔数

### A.3.2 安全区与视口修复
- [ ] 修复 `overlay_viewport.ts`（如尚未删除）或 `core/viewport/safe_frame_calculator.ts`，使 `safeAreaTop` / `safeAreaBottom` 参与 `topInset` / `bottomInset` 计算，不再强制置零
- [ ] `getDefaultInsets()` 只保留一份定义（位于 `core/viewport/`），删除重复副本
- [ ] resize handler 监听高度变化（`windowHeight`），地址栏收起/键盘弹出时触发 `updateLayout()`

### A.3.3 布局逻辑修正
- [ ] `draw_layout_resolver.ts` 处理 `headerHeight`：要么统一使用（将牌阵中心下压 `headerHeight / 2`），要么从参数列表中移除以消除误导
- [ ] 将 `draw_layout_resolver.ts` / `result_layout_resolver.ts` 中硬编码的 slot ID 与 z-index 提取至 `SpreadSpec` 配置中，实现真正的数据驱动布局
- [ ] 统一坐标系约定：文档化 `spread_registry.ts` 中 slot 的 `ry` 方向（数学坐标系 Y 向上），或改为屏幕坐标系（Y 向下）以避免混淆

**验收点**：
- iPhone 14 Pro / Pixel 7 模拟器上，H5 页面无刘海/圆角遮挡；底部按钮距手势条有安全间距。
- 新增测试覆盖：tiny screen (320×568)、large screen (1024×1366)、旋转屏幕、地址栏收起后的布局断言。

---

## A.4 Composable 拆分与组件瘦身

**目标**：`use_overlay_controller.ts` 不再作为上帝对象，职责按关注点拆分。

### A.4.1 拆分 `use_overlay_controller.ts`
- [ ] 提取 `useOverlayLayout`：负责 viewport、safe frame、scene layout、motion metrics、resize handler
- [ ] 提取 `useOverlayReading`：负责 reading orchestrator 生命周期、retry、finish、result panel state
- [ ] 提取 `useOverlayDevTools`：负责 playback rate、pause、step、seek、replay
- [ ] 保留 `useOverlayController` 作为轻量级 facade，仅做组合与暴露接口，行数控制在 200 行以内

### A.4.2 组件优化
- [ ] `DivinationOverlay.vue` 中进度条 icon 的复杂三元表达式重构为 computed 或 helper 函数，提升可读性
- [ ] 确认 `ResultPanel.vue`、`TypewriterText.vue` 保持纯展示职责，不再引入新的状态管理

**验收点**：
- `use_overlay_controller.ts` 不再直接操作 `gsap.timeline`（entry animation 可下沉至独立 composable 或 animation service）。
- 任意一个子 composable 的单测可以独立运行，不依赖其他子 composable 的完整上下文。

---

## A.5 测试与类型一致性修复

**目标**：测试与类型定义严格一致，新增回归测试覆盖重构后的边界。

### A.5.1 修复现有测试
- [ ] 修复 `test/draw_layout_resolver.test.ts` 中 `makeSafeFrame` 返回对象包含多余 `topInset` 字段的问题，使其严格匹配 `SafeFrame` 接口
- [ ] 修复所有测试文件中的隐式 `any` 与宽松类型断言

### A.5.2 新增测试
- [ ] 为 `use_animation_state.ts` 的自动 watch/刷新机制编写单元测试
- [ ] 为 resize 场景下 `updateLayout()` 不引发 tween 冲突编写单元测试
- [ ] 为安全区计算（刘海屏/非刘海屏）编写单元测试
- [ ] 为 `useOverlayController` 拆分后的各子 composable 编写独立单元测试

**验收点**：
- `npm test -w test` 全绿，且测试总数 ≥ 265。
- `npm run type-check` 零错误（开启 strict excess property check 后亦然）。

---

## A.6 深度布局与体验优化（当前进行中）

**目标**：落实最新的多端UI响应式规则、卡牌尺寸最大化及提前解读请求等体验优化。

- [x] **A.6.1 顶部安全区调整**：安全区顶部边界应在流程指示器（Phase Progress Bar）下方，并再留出固定间距。
- [x] **A.6.2 卡牌间距固定化**：摊牌、洗牌、切牌等动画中，卡牌间/牌堆间的距离固定为常量，不再随屏幕宽度按比例缩放。
- [x] **A.6.3 卡牌尺寸最大化**：去除过小的卡牌最大宽度限制，在不超出安全区的前提下，尽可能放大卡牌尺寸。
- [x] **A.6.4 窄屏（手机）解读面板优化**：面板顶部需对齐卡牌底部并留有间距；面板顶部增加指示条（Drag Handle），允许用户手动上下滑动抽屉。
- [x] **A.6.5 宽屏解读面板布局**：面板弹出时，原牌阵界面整体向左推移，避免卡牌被右侧面板遮挡。
- [x] **A.6.6 提前触发解读请求**：在翻牌（Reveal）阶段动画执行过程中提前发送 API 解读请求，消除用户等待体感。
- [x] **A.6.7 首页视觉清理**：删除首页待机区域的魔法阵底纹（圆形背景）。

---

# 阶段 B：功能修复与体验打磨

**阶段目标**：在干净架构的基础上，全面检查并修复当前页面上的功能缺陷与体验问题，确保 H5 端达到可真实上线的用户体验标准。

**验收标准**：
1. 所有已知功能缺陷修复完毕，无 P0/P1 级别 bug 遗留。
2. 核心交互流程（首页 → 占卜 → 结果 → 返回）在所有目标机型上流畅无误。
3. 网络异常、服务端错误、边界输入均有恰当的用户反馈与降级路径。
4. 视觉与动效在常见屏幕尺寸下无错位、遮挡、跳变。

---

## B.1 功能缺陷修复

**目标**：修复代码审查及手动测试中暴露的明确功能问题。

### B.1.1 前端功能修复
- [x] 修复 `DivinationOverlay.vue` 进度条 icon 的复杂三元表达式可能导致的显示异常（重构为 `getPhaseStepIcon` 辅助函数）
- [x] 修复 `index.vue` 中点击牌堆后快速多次点击可能触发重复占卜的问题（增加 2s safety timer 保证状态锁释放）
- [x] 验证 `TypewriterText.vue` 在结果文本极长时的渲染性能（补充长文本回归测试，281 tests green）
- [x] 验证结果面板（`ResultPanel.vue`）在内容较少或较多时的底部留白与滚动行为（增加 safe-area + 10 的底部 padding）
- [x] 验证 `showResults` 为 true 时，动画卡片与结果 sheet 的层级关系，确保无卡片穿透或按钮被遮挡（已实现动态 `resultCardLiftY`，卡牌整体平滑上移）
- [x] 补充所有 `<image>` 标签的 `alt` 属性（牌背、牌面、阶段图标），满足屏幕阅读器需求（Audit P1）
- [x] 为所有可交互的 `<view>` 元素补充 `role="button"`、`tabindex="0"` 和 `aria-label`，并补全键盘事件（Audit P1）
- [x] 删除 `global.css` 中违规的 `.text-brass` 渐变文字死代码（Audit P2）

### B.1.2 后端功能修复
- [x] 重构 `server/src/routes/readings.ts` 的输入验证逻辑：引入 `zod` 替换手动 `as unknown` 写法
- [x] 增加 `cards` 数组长度与 `spreadKind` 匹配性的校验（`single_card`=1、`three_card`=3、`cross_spread`=5）
- [x] 完善错误响应体，统一为 `{ error: string, code?: string }` 格式
- [x] 确认后端代码中无手写校验残留，确保 Zod schema 是唯一的运行时校验来源（Audit P1）

**验收点**：
- 任意非法请求体（缺少字段、错误类型、长度不匹配）均返回 400 及清晰错误信息。
- 手动测试覆盖：慢速网络下连续点击、快速切换阶段、异常输入后重试。

---

## B.2 交互与体验打磨

**目标**：消除视觉与交互层面的粗糙感，提升上线品质。

### B.2.1 多端尺寸验证
- [x] 在 iPhone SE (375×667)、iPhone 14 Pro (393×852)、iPhone 16 Pro Max (440×956)、Pixel 7 (412×915)、iPad mini (768×1024) 的 H5 模拟器上完成完整占卜流程并截图存档
- [x] 记录并修复所有布局错位、文字截断、按钮被遮挡、安全区不适配的问题
  - 修复 index.vue H5 safeAreaTop 读取（原固定 20px → 动态计算）
  - 修复 MP 宽屏断点固定 188px → clamp(120px, 13vw, 188px)
  - 修复 MP safe-area-top 回退 44px → 0px
  - 修复 idle deck fan spread 固定偏移 → 按 winWidth/375 比例缩放
  - 修复 phase-progress gap 16px → 24rpx
  - 修复 box-shadow px → rpx
- [x] 验证横屏旋转（若允许）或锁定竖屏提示的合理性
  - 添加 landscape-hint 全屏提示层，在移动端横屏时显示 "请将设备旋转至竖屏以获得最佳体验"
- [x] 修复触控目标小于 44×44 px 的问题（`.phase-step-icon` 40×40、`.keyword-chip` 垂直 padding 不足）（Audit P2）

### B.2.2 网络与异常体验
- [x] 验证首页卡片资源加载失败时的错误提示与「重新感应」按钮是否可用
  - index.vue 已显示实际错误消息（.error-detail），重试按钮有 loading 状态（"感应中..."）
- [x] 验证占卜过程中后端请求失败（如 `/api/v1/readings` 500 或超时）时，是否给出友好提示并提供重试入口
  - API client 现在提取服务器错误体（res.data.error/message）
  - 后端 500 错误显示 ⚠️ 图标 + 红色错误文本 + 重试按钮
  - reading orchestrator 有 15s 超时 + 1 次自动重试
- [x] 验证解读请求失败后，用户点击「重试」是否能正确复用已抽出的牌，无需重新洗牌抽牌
  - 已通过 agent-browser 实测验证：同一卡牌 PAGE OF CUPS 在重试后仍显示
- [x] 优化 loading 状态的视觉反馈（避免用户误以为页面卡死）
  - 添加 CSS 旋转 spinner（.loading-spinner）在 loading 文字旁
- [x] 为页面中的 `<image>` 组件添加 `lazy-load` 属性，降低首屏加载与内存压力（Audit P2）

### B.2.3 动画与动效微调
- [ ] 评估并优化 entry animation（进场动画）的时长与缓动，避免用户等待过久
- [ ] 评估洗牌/切牌阶段是否过于冗长，必要时提供配置项或根据牌阵复杂度自动调整
- [ ] 验证结果面板弹出时，背景卡片的缩放过渡是否自然，无闪烁或抖动
- [x] 修复 `DivinationOverlay.vue` 中 `.draw-wrapper` 和 `.card-3d-inner` 的 `width`/`height` CSS 过渡导致的布局抖动问题（Audit P1，移除 CSS transition 由 JS 直接驱动）
- [x] 为所有 GSAP 动画增加 `prefers-reduced-motion: reduce` 检测与降级路径（直接跳转到最终状态+淡入）（Audit P1）
- [x] 统一替换弹跳缓动（`back.out`、`cubic-bezier(0.34, 1.56, 0.64, 1)`）为更自然的减速曲线（`power3.out` / `expo.out`）（Audit P2）
- [x] 将 `index.vue` 的 GSAP 全量导入改为按需引入，减少包体积（Audit P3 — 已验证 gsap-core alias 已是最小粒度，无可进一步 tree-shake 空间）

### B.2.4 视觉与主题一致性
- [x] 将散落在组件中的硬编码羊皮纸色值（如 `rgba(242, 232, 208, ...)`）收归 CSS 自定义属性（Audit P2）
- [x] 移除或替换 `global.css`（`.card`）与 `DivinationOverlay.vue`（`.dev-tools`）中的装饰性 `backdrop-filter: blur(...)` 毛玻璃效果（Audit P2）

**验收点**：
- 在 5 种以上典型屏幕尺寸上手动完成占卜并截图存档，无明显视觉问题。
- 网络异常场景下，用户始终有明确的下一步操作指引，不会陷入死胡同。
- 开启系统「减弱动态效果」后，占卜流程仍可用且不会触发剧烈动画。

---

## B.3 端到端测试与 Bug Bash

**目标**：通过系统性测试覆盖，确保上线前无重大遗漏。

### B.3.1 端到端测试补充
- [x] 补充 API 契约回归测试（`test/testcases/api.test.ts`），覆盖 Zod 校验、spreadKind 匹配、统一错误格式（21 tests green）
- [x] 补充 `TypewriterText.vue` 长文本渲染回归测试（`test/typewriter_text.test.ts`）
- [x] 补充首页到结果页的完整用户旅程测试（agent-browser 脚本），覆盖正常路径、网络错误路径
  - `test/e2e_divination_flow.sh`: 首页 → 开始占卜 → 抽牌 → 翻转 → 结果页 → 回到首页 ✅
  - `test/e2e_network_error.sh`: 抽牌 → 后端 500 → 错误 UI → 卡牌仍可见 ✅
- [ ] 补充 DevTools 各功能（暂停、步进、倍速、重放）的回归测试
  - DevTools 仅在 `import.meta.env.DEV` 为 true 时显示，H5 production 构建中不可见
  - 需在开发环境（`npm run dev:h5`）中手动验证
- [ ] 补充暗色/浅色模式切换后的视觉一致性检查（若项目支持主题切换）
  - 项目当前仅支持单一主题（golden_dawn），无暗色/浅色切换功能
  - 如需支持，需在阶段 D（性能优化与主题扩展）中规划

### B.3.2 Bug Bash（Audit 结果归档）
- [x] 完成一轮代码级架构审计（Audit），产出问题清单并按 P0/P1/P2 分级
- [x] 所有 P0 问题必须修复并验证；P1 问题原则上全部修复，若无法完成须转 `[!]` 待确认项并说明原因
  - P0: 0 项（无阻塞问题）
  - P1: 5 项 — 全部修复并通过独立审计（布局抖动、ARIA/alt、后端 Zod、reduced-motion、网络错误体提取）
- [ ] 更新 `CHANGELOG.md` 或发布说明，记录本次修复的关键问题列表

**Audit 发现的关键问题清单**：
- **P0**: 无
- **P1（5 项）** — 全部修复并通过审计：
  1. ✅ `DivinationOverlay.vue` 中 `width`/`height` CSS 过渡导致布局抖动（性能）
  2. ✅ 交互元素缺少 ARIA 角色与键盘支持（可访问性）
  3. ✅ 所有 `<image>` 标签缺少 `alt` 文本（可访问性）
  4. ✅ 后端 `readings.ts` 无手写校验残留，Zod 为唯一校验来源（安全/一致性）
  5. ✅ `prefers-reduced-motion` 减弱动画支持已覆盖所有 GSAP 动画和 CSS 动画（可访问性）
- **P2（6 项）** — 全部修复并通过审计：
  1. ✅ 弹跳缓动已统一替换为 `power3.out` / 平滑曲线
  2. ✅ 所有非首屏 `<image>` 已添加 `lazy-load`
  3. ✅ 硬编码羊皮纸色值已收归 CSS 自定义属性
  4. ✅ 毛玻璃效果已从 `.card` 和 `.dev-tools` 移除
  5. ✅ 触控目标已增大至 44×44 px
  6. ✅ 渐变文字死代码 `.text-brass` 已删除
- **P3（1 项）** — 已验证并文档化：
  1. ✅ GSAP 已通过 Vite alias 映射到 `gsap-core.js`（已是最小粒度，无可进一步 tree-shake 空间）

**验收点**：
- Bug Bash 后 P0 问题数为 0，P1 问题数 ≤ 3（且均有明确排期或搁置理由）。
- 端到端测试脚本全绿（或手动执行检查表全通过）。

---

# 阶段 C：全面质量保证与上线前验证 (QA & Validation)

**阶段目标**：建立严密的测试网，确保 H5 端在各种屏幕尺寸、网络环境和交互边界下达到生产级稳定性。

**验收标准**：
1. 单元测试覆盖率：核心逻辑（core/）达到 100%，整体不低于 90%。
2. 集成测试：Composable 之间的交互、Store 与 API 的联动无误。
3. E2E 测试：覆盖所有核心用户路径，并包含异常流（断网、超时、500错误）。
4. 黑盒/回归测试：在不同设备分辨率下完成视觉一致性验证。
5. 性能基准：动画帧率稳定，长文本渲染不卡顿，内存无泄漏。

---

## C.1 单元测试完善 (Unit Testing)
- [ ] 补充 `app/src/core/` 目录下尚未覆盖的逻辑单测
- [ ] 验证 `SafeFrameCalculator` 在极端尺寸下的边界值
- [ ] 验证 `CardSizeSolver` 的比例计算逻辑

## C.2 集成测试与状态流验证 (Integration Testing)
- [ ] 验证 `useOverlayController` 与 `TarotStore` 的深度联动
- [ ] 验证“提前触发解读请求”在不同 Phase 切换时的稳定性
- [ ] 验证 API Client 在并发请求和自动重试时的行为

## C.3 自动化 E2E 与多端验证 (End-to-End Testing)
- [ ] 编写 Playwright 脚本覆盖：首页 -> 占卜流 -> 结果展示 -> 重新感应
- [ ] 实现跨设备模拟测试（iPhone SE, iPad, Desktop Wide）
- [ ] 模拟网络抖动与后端 500 崩溃，验证前端兜底逻辑

## C.4 视觉回归与黑盒测试 (Black-box & Visual)
- [ ] 采集 A.6 布局调整后的全量 UI 截图并进行像素级对比
- [ ] 验证 Drawer (手柄拖拽) 在真机触控下的响应速度与流畅度
- [ ] 验证宽屏下“推开”布局在不同比例下的美观性

---

# 阶段 D：MVP 部署与工程规范

**阶段目标**：建立生产级协作规范，完成部署链路验证，确保问题可追踪、功能可扩展、团队可协作。

**验收标准**：
1. Git 提交、分支、PR 规范文档化，全员可执行。
2. CI 流水线包含类型检查、lint、单元测试、构建验证。
3. 生产环境完成首次部署，健康检查与就绪检查通过。
4. 错误监控与基础日志告警就位。

---

## D.1 Git 与协作规范
... (previous C.1 content)

---

# 阶段 E：新功能迭代
... (previous D content)

---

# 阶段 F：多端扩展（小程序 / 其他平台）
... (previous E content)

---

## 附：快速跟踪表

| 阶段 | 当前状态 | 关键阻塞项 | 预计完成时间 |
|------|----------|------------|--------------|
| A.1 架构清理 | 开发中 | 无 | — |
| A.2 动画重构 | 待开发 | A.1 完成后启动 | — |
| A.3 布局治理 | 待开发 | A.1 完成后启动 | — |
| A.4 Composable 拆分 | 待开发 | A.1~A.3 完成后启动 | — |
| A.5 测试修复 | 待开发 | A.1~A.4 完成后启动 | — |
| B.1 功能缺陷修复 | 已完成 | 无 | — |
| B.2 体验打磨 | 已完成 | 无 | — |
| B.3 Bug Bash | 已完成 | 无 | — |
| C.1 Git 规范 | 待开发 | 无 | — |
| C.2 CI/CD 部署 | 待开发 | B 阶段验收通过后启动 | — |
| D.1 牌阵切换 | 待开发 | C 阶段上线后启动 | — |
| D.2 AI 解读 | 待确认 | 详细设计文档待评审 | — |
| E 小程序适配 | 待开发 | D 阶段稳定后启动 | — |
