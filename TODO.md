# TODO — Scales Tarot

> 文档更新日期：2026-04-18
> 当前主线：A 阶段审计 → B 阶段整改 → C 阶段测试 → D 阶段部署 → E 阶段演进

---

## 📌 状态标记与更新规则

### 状态标记

| 标记 | 含义 | 流转 |
|---|---|---|
| `[ ]` | 待开始 | 初始状态 |
| `[~]` | 进行中 | 任务开始时立即标记 |
| `[?]` | 待验收 | 实现完成、等待独立审计验证 |
| `[x]` | 已完成 | 审计验证通过 |
| `[!]` | 阻塞/待确认 | 遇到阻塞、依赖外部条件或方案待评审 |

流转规则：`[ ]` → `[~]` → `[?]` → `[x]`，任何阶段均可转为 `[!]` 并注明原因。

### TODO 即时更新规则

1. **开始即标记**：任务开始时，立即将 `[ ]` 改为 `[~]`，禁止事后补标。
2. **完成即更新**：任务完成或取得阶段性进展时，立即更新状态，禁止批量延迟到对话末尾统一更新。
3. **阻塞即记录**：遇到阻塞转为 `[!]` 时，必须在条目后注明阻塞原因和依赖方。
4. **验收即闭环**：标记 `[x]` 必须对应可验证的证据（测试通过、构建成功、截图或日志）。
5. **单一事实源**：TODO.md 是执行状态的唯一事实源，所有状态以本文件为准。

---

## 📋 阶段 A：全面审计（Multi-Agent Audit）

> 目标：用 10 个 Agent 分 4 组，对项目前后端进行全面审计，经交叉审查后产出可信的 P0/P1/P2 分级结论，为阶段 B 整改提供输入。
>
> 流程：A0 基线准备 → A1 专项审计（4 组并行）→ A2 交叉审计（组间互审）→ A3 汇总定级
>
> 核心规则：
> - **禁止单 Agent 独自工作无审计** — 每组至少 2 人，结论经交叉审查
> - **禁止跳过基线验证** — A0 未通过则阻塞全部审计
> - **禁止自己审计自己** — 交叉审查由其他组执行

---

### A0：基线准备（Gate 0）

> 目标：确认审计前提条件全部满足。此阶段 FAIL 则阻塞后续所有审计。

#### A0.1 构建与质量门

- [ ] `npm run type-check` — 0 error
- [ ] `npm run lint` — 0 error（允许 warn）
- [ ] `npm test -w test` — 全部 PASS
- [ ] `npm run build:h5` — 构建成功，产物可访问
- [ ] `npm run build:server` — 编译成功

> 验收：5 项全部通过方可推进。任一失败标记 `[!]` 并记录具体错误。

#### A0.2 运行环境验证

- [ ] `npm run dev:h5` 启动 — localhost 首页可渲染
- [ ] 后端 API 验证 — `POST /api/v1/readings` 响应正常
- [ ] E2E 链路验证 — `test/e2e_divination_flow.sh` 通过

> 验收：核心链路 idle → result 可完整走通。

#### A0.3 截图证据采集

> 执行者：`engineering-frontend-developer`（截图）+ `design-ui-designer`（审核完整性）
> 产出目录：`docs/audit/screenshots/`
> 命名规则：`A0_<scene>_<frame>.png`

| 场景 | 帧数 | 涵盖内容 |
|---|---|---|
| idle 首页待机 | 3 | 标题、牌堆、牌阵选择器、入场动画 |
| deck_click 退场 | 2 | 点击牌堆后的退场过渡 |
| shuffling 洗牌 | 3 | 牌组运动轨迹、视觉反馈 |
| cutting 切牌 | 3 | pile 分离动画、空间感 |
| drawing 抽牌 | 5 | 卡牌抽出、spread 布局、悬停 |
| revealing 揭牌 | 3 | 翻转动画、等待解读的加载态 |
| result 结果展示 | 4 | panel 滑入、typewriter、完整展示、再占一次入口 |
| error 错误状态 | 2 | API 失败提示、重试按钮 |
| wide_screen 宽屏 | 2 | ≥768px 布局、side-by-side |
| narrow_screen 窄屏 | 2 | <768px 布局、卡牌上移 |

- [ ] 全部 10 场景截图已采集（共 29 帧）
- [ ] `docs/audit/screenshots_manifest.md` 截图清单已产出
- [ ] `design-ui-designer` 已确认截图覆盖完整、无空白帧

> 验收：截图清单通过 `design-ui-designer` 审核签字。

#### A0 完成标准

- [ ] A0.1 构建质量门全部 PASS
- [ ] A0.2 运行环境全部 PASS
- [ ] A0.3 截图证据已归档并审核
- [ ] **Gate 0 判定**：全部通过 → 进入 A1；任一 `[!]` → 阻塞并修复后重新验证

---

### A1：专项审计（4 组并行）

> 目标：4 个审计组按职责完成独立审计。
> 发现项格式：编号 + 一句话标题 + 文件:行号 + 现象 + 影响 + 修复建议 + P0/P1/P2 定级。
> 所有发现在 A3 汇总后直接写入阶段 B 的 TODO 条目。

#### 组 1：体验与交互审计

| 角色 | Agent | 职责 |
|---|---|---|
| 主审 | `design-ux-architect` | 布局架构、响应式断点、safe frame 体系 |
| 副审 | `design-ux-researcher` | 用户旅程完整性、交互反馈、认知负荷 |
| 副审 | `design-ui-designer` | 主题一致性、CSS 变量消费、视觉层级 |

**审计输入文件**：

| 文件 | 审查重点 |
|---|---|
| `app/src/core/layout/scene_layout.ts` | resolveSceneLayout 逻辑、断点行为 |
| `app/src/core/layout/draw_layout_resolver.ts` | draw 阶段卡牌定位 |
| `app/src/core/layout/result_layout_resolver.ts` | result 阶段布局与遮挡 |
| `app/src/core/viewport/safe_frame_calculator.ts` | 安全区计算对齐真实设备 |
| `app/src/composables/useOverlayLayout.ts` | isWide 判定、响应式切换一致性 |
| `app/src/stores/theme.ts` | golden_dawn 主题令牌消费完整性 |
| `app/src/components/DivinationOverlay.vue` | CSS 变量映射、scoped style 隔离 |
| `app/src/styles/global.css` | 全局样式与组件样式冲突风险 |

**引用截图**：idle / result / wide_screen / narrow_screen（至少 5 张）

- [ ] 审计执行完成
- [?] 验收：所有发现关联到文件路径+行号，每个 P0 有复现步骤

---

#### 组 2：动画与性能审计

| 角色 | Agent | 职责 |
|---|---|---|
| 主审 | `engineering-frontend-developer` | GSAP 时序链路、CSS 动画清理、动画 lifecycle |
| 副审 | `testing-performance-benchmarker` | idle CPU、内存泄漏、重排频率、GSAP 实例回收 |

**审计输入文件**：

| 文件 | 审查重点 |
|---|---|
| `app/src/core/flow/phases/shuffle_phase.ts` | timeline 创建与回收 |
| `app/src/core/flow/phases/cut_phase.ts` | timeline 创建与回收 |
| `app/src/core/flow/phases/draw_phase.ts` | timeline 创建与回收 |
| `app/src/core/flow/phases/reveal_phase.ts` | timeline 创建与回收 |
| `app/src/core/animation/types.ts` | 动画类型定义 |
| `app/src/composables/use_animation_state.ts` | 动画状态机生命周期 |
| `app/src/composables/use_overlay_controller.ts` | killTweensOf 调用时机、卸载清理 |
| `app/src/components/TypewriterText.vue` | typewriter 残留 timer |
| `app/src/utils/overlay_animation/` | 动画工具函数性能特征 |

**性能红线检查项**（参照 AGENTS.md §性能红线）：

- [ ] 无无条件永久挂载的 `will-change` → PASS/FAIL
- [ ] 无 GSAP `onUpdate` 中的大量字符串拼接 → PASS/FAIL
- [ ] resize 不会与运行中 tween 冲突 → PASS/FAIL
- [ ] `gsap.killTweensOf()` 在组件卸载时均被调用 → PASS/FAIL
- [ ] 无 orphan timer / interval / requestAnimationFrame → PASS/FAIL

**引用截图**：shuffling / cutting / drawing / revealing

- [ ] 审计执行完成
- [ ] 性能红线 5 项逐条给出 PASS/FAIL + 证据
- [?] 验收：所有 GSAP timeline 实例列出创建/销毁配对

---

#### 组 3：架构与代码质量审计

| 角色 | Agent | 职责 |
|---|---|---|
| 主审 | `engineering-software-architect` | Pinia/Controller/Orchestrator 分层边界、命名一致性 |
| 副审 | `engineering-code-reviewer` | 类型严格性、Magic Number、死代码、边界条件 |
| 副审 | `engineering-security-engineer` | Math.random 安全性、API 输入校验、XSS/注入、依赖漏洞 |

**审计输入文件**：

| 文件 | 审查重点 |
|---|---|
| `app/src/stores/tarot.ts` | store 边界、状态暴露范围 |
| `app/src/stores/theme.ts` | store 职责单一性 |
| `app/src/composables/` 全部 | controller 与 store 职责切分 |
| `app/src/utils/` 全部 | reading/orchestrator/presenter 层级关系 |
| `app/src/core/` 全部 | 纯计算模块是否真正无框架依赖 |
| `app/src/api/` 全部 | 前端 API 层错误抽象充分性 |
| `app/src/core/config/layout_constants.ts` | 常量集中度（参照 AGENTS.md §魔法数字） |
| `server/src/app.ts` | Express 装配、中间件顺序 |
| `server/src/routes/` 全部 | 路由输入校验、Zod 覆盖度 |
| `server/src/services/` 全部 | 服务层职责边界、错误格式一致性 |
| `server/src/config.ts` | 后端配置集中度 |

**代码质量 Checklist**（参照 AGENTS.md §代码审查 Checklist）：

- [ ] 是否存在死代码或重复代码？ → 列出位置
- [ ] 魔法数字是否已集中配置？ → 列出散落位置
- [ ] 类型定义是否严格，无隐式 `any`？ → 列出 `as any` 位置
- [ ] 后端路由是否有输入校验与异常处理？ → 逐路由检查
- [ ] 前端 API 层是否有统一错误处理？ → 检查 `client.ts`
- [ ] `npm audit --omit=dev --audit-level=high` → 列出漏洞

- [ ] 审计执行完成
- [ ] 模块依赖关系描述已产出
- [?] 验收：安全审计覆盖 npm audit 结果，所有发现关联到文件路径

---

#### 组 4：兼容性与可访问性审计

| 角色 | Agent | 职责 |
|---|---|---|
| 主审 | `testing-accessibility-auditor` | prefers-reduced-motion、aria、键盘导航、色彩对比度 |
| 副审 | `engineering-wechat-mini-program-developer` | uni-app 条件编译、rpx 兼容、safeArea API、横屏提示 |

**审计输入文件**：

| 文件 | 审查重点 |
|---|---|
| `app/src/components/DivinationOverlay.vue` | aria-label / role / tabindex |
| `app/src/components/ResultPanel.vue` | 结果区无障碍可读性 |
| `app/src/styles/global.css` | `@media (prefers-reduced-motion)` 降级 |
| `app/src/utils/accessibility.ts` | 现有工具函数覆盖面 |
| `app/src/core/viewport/viewport_metrics.ts` | 多端视口适配 |
| `app/vite.config.ts` | uni-app 条件编译配置 |
| `app/src/manifest.json` | 小程序配置字段完整性 |

**无障碍检查项**（至少 8 项）：

- [ ] 关键交互元素有 aria-label → PASS/FAIL
- [ ] 动态内容有 aria-live 通告 → PASS/FAIL
- [ ] 全流程可纯键盘完成 → PASS/FAIL
- [ ] 焦点管理合理（overlay 打开/关闭时） → PASS/FAIL
- [ ] 色彩对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大字） → PASS/FAIL
- [ ] prefers-reduced-motion 下动画降级 → PASS/FAIL
- [ ] 触控目标 ≥ 44×44px → PASS/FAIL
- [ ] 图片/图标有 alt 或 aria-hidden → PASS/FAIL

**小程序兼容分类**：

- [ ] 按「阻塞 H5」vs「仅影响 MP」分类所有兼容问题

- [ ] 审计执行完成
- [?] 验收：无障碍 8 项逐条 PASS/FAIL，小程序问题已分类

#### A1 完成标准

- [ ] 4 组审计全部完成
- [ ] 每组发现含编号、文件路径、截图引用
- [ ] **Gate 1 判定**：4 组审计齐备 → 进入 A2

---

### A2：交叉审计（组间互审）

> 目标：每组审计结论由另一组 Agent 复核，校准严重度、补充盲区。
>
> 核心规则：禁止自审。每份交叉审查至少 3 条实质性点评（含认同/异议/补充发现）。

| 被审组 | 交叉审查者 | 审查焦点 |
|---|---|---|
| 组1 体验交互 | 组2 `engineering-frontend-developer` | 体验问题是否有技术根因？严重度是否合理？ |
| 组2 动画性能 | 组3 `engineering-software-architect` | 性能问题是否源于架构缺陷？ |
| 组3 架构质量 | 组1 `design-ux-architect` | 架构建议是否破坏用户体验？ |
| 组4 兼容可访问性 | 组2 `testing-performance-benchmarker` | 无障碍降级是否引入性能问题？ |

- [ ] 交叉审查 1：组2 审查组1 结论
- [ ] 交叉审查 2：组3 审查组2 结论
- [ ] 交叉审查 3：组1 审查组3 结论
- [ ] 交叉审查 4：组2 审查组4 结论

#### A2 完成标准

- [ ] 4 份交叉审查全部完成
- [ ] 每份至少 3 条实质性点评
- [ ] **Gate 2 判定**：交叉审查齐备 → 进入 A3

---

### A3：汇总定级 → 写入 B 阶段计划

> 目标：合并所有审计发现，统一定级，直接写入阶段 B 的 TODO 条目。
>
> 执行者：规划者角色（Claude），非任何审计组 Agent。

#### A3.1 合并去重

- [ ] 合并 4 组审计发现 + 4 份交叉审查意见
- [ ] 同一问题被多组发现的，合并为一条，保留最严格定级
- [ ] 交叉审查中有异议的条目，由规划者最终裁定

#### A3.2 定级标准

| 级别 | 定义 | 典型举例 |
|---|---|---|
| **P0** | 阻塞发布或破坏核心流程 | 构建失败、核心路径白屏、安全漏洞 |
| **P1** | 严重影响体验但不阻塞功能 | 动画卡顿、布局跳变、错误路径无恢复 |
| **P2** | 可改善但不紧急 | 命名不一致、非关键 aria 缺失、代码冗余 |

#### A3.3 写入 B 阶段

- [ ] 按 P0 → P1 → P2 将发现逐条写入下方阶段 B 的对应子节（B1/B2/B3）
- [ ] 每条格式：`- [ ] [编号] 标题（文件路径）— 修复者 / 验收标准`
- [ ] 每个 P0 条目必须有明确修复负责方和验收标准

#### 阶段 A 完成标准

- [ ] 4 组审计 + 4 轮交叉审查全部完成
- [ ] 阶段 B 的 B1/B2/B3 条目已填充
- [ ] 所有 P0 条目有明确修复方和验收标准
- [ ] **阶段 A 完成判定**：B 阶段整改计划经用户确认 → 进入阶段 B

---

## 🔧 阶段 B：整改修复（Remediation）

> 目标：根据阶段 A 审计结论，按优先级执行代码修复，完成后统一同步文档。
>
> 工作流：P0 修复 → P1 修复 → P2 修复 → 文档同步
>
> 规则：
> - 每个修复项完成后必须由独立 Agent 审计验证（禁止自审）
> - 修复不得引入新的 P0/P1 问题
> - 文档更新统一在所有代码修复完成后执行，避免文档反复修改

### B1：P0 阻塞级修复

> 阻塞发布或破坏核心流程的问题。全部关闭方可推进 B2。

- [x] A001 npm 依赖安全漏洞：@intlify/core-base 原型链污染 + XSS（GHSA-p2ph-7g93-hw3m, GHSA-x8qh-wqqm-57ph），esbuild 开发服务器请求劫持（GHSA-67mh-4wv8-2f99）— engineering-security-engineer / 升级 @intlify 包至 9.14.5+ 或锁定无漏洞版本；esbuild 升级至 0.25+；CI 添加 npm audit --omit=dev --audit-level=high 拦截
- [x] A002 lint 15 个 error 未修复，包含小程序兼容性违规（window 全局变量 6 处、TouchEvent 未定义 2 处、vue/no-unused-vars 1 处）— engineering-frontend-developer / 修复所有 lint error 至 0；viewport_metrics.ts 和 accessibility.ts 中 window 使用需用 uni-app API 替换或加条件编译保护
- [x] A003 index.vue onUnmounted 未清理 handleDeckClick 中 gsap.to(_cards) 和 gsap.to(_scene) 的运行中 tween，可能导致组件卸载后回调执行 — engineering-frontend-developer / 在 onUnmounted 中添加 gsap.killTweensOf(_cards) 和对 _scene tween 的清理
- [x] A004 index.vue onUpdate 回调中存在字符串模板拼接（sceneStyle.value 拼接 transform/opacity），高频触发时产生大量临时字符串 — engineering-frontend-developer / 改用 ref 对象驱动样式，或使用与 overlay controller 一致的 refresh 函数模式

> 验收：每项修复由独立 Agent 验证 PASS。全部 P0 关闭后进入 B2。

### B2：P1 严重级修复

> 严重影响体验但不阻塞功能的问题。

- [x] A101 global.css 缺失 prefers-reduced-motion 降级块，全局动画工具类（animate-pulse-glow、animate-breathe、animate-spin）无运动降级 — testing-accessibility-auditor / 在 global.css 底部添加 @media (prefers-reduced-motion: reduce) 块，禁用所有无限循环动画
- [x] A102 will-change: transform 在 3 处无条件永久挂载（index.vue .scene-container L358、.tarot-card L441；DivinationOverlay.vue .tarot-card L606），造成持续 GPU 合成层内存开销 — engineering-frontend-developer / 改为 GSAP 动画 onStart/onComplete 动态添加/移除 will-change
- [x] A103 ResultPanel.vue 无任何 aria 属性（无 aria-live、无 role=region、无 aria-label），屏幕阅读器无法感知结果内容更新 — testing-accessibility-auditor / 添加 aria-live=polite 到结果面板、role=region + aria-label 到各卡牌解读区
- [x] A104 DivinationOverlay.vue 无焦点陷阱（focus trap），overlay 打开时 Tab 键可跳出 overlay 到背后页面元素 — testing-accessibility-auditor / 实现 focus trap：overlay 打开时聚焦首个可交互元素，Tab 循环在 overlay 内
- [x] A105 prefersReducedMotion() 函数在 accessibility.ts 和 typewriter_model.ts 中重复实现，后者缺少条件编译保护（直接使用 window.matchMedia）— engineering-frontend-developer / 统一为 accessibility.ts 单一实现，typewriter_model.ts 导入复用；加 #ifdef H5 条件编译
- [x] A106 reading_orchestrator.ts 超时 setTimeout（L57）未在 reset/cancel 时清理，可能造成组件卸载后 reject 被调用 — engineering-frontend-developer / 在 reset() 中 clearTimeout 超时定时器
- [x] A107 16 个 lint warning 包含多处未使用变量（refreshLefts/refreshRights/refreshPiles/refreshInners、getDefaultPhaseOrder、SceneLayoutResult、RESULT_SHEET_FRACTION 等），存在死代码 — engineering-code-reviewer / 清理所有未使用变量和导入，或加 _ 前缀标记有意忽略
- [x] A108 manifest.json mp-weixin.appid 已硬编码（wx8968432b8ba12eaa），且 app-plus.android.permissions 包含不必要权限（CAMERA、READ_PHONE_STATE、READ_LOGS）— engineering-wechat-mini-program-developer / appid 改为环境变量注入；移除与塔罗应用无关的 Android 权限声明

> 验收：每项修复由独立 Agent 验证 PASS。

### B3：P2 建议级优化

> 可改善但不紧急的问题，按投入产出比选择性执行。

- [x] A201 核心塔罗牌洗牌逻辑使用 Math.random()（tarotReading.ts L50, L55），非密码学安全随机 — engineering-security-engineer / 替换为 crypto.getRandomValues() 实现可证实的真随机
- [x] A202 draw_phase.ts L111 使用 Math.random() 生成预旋转角度，非确定性 — engineering-frontend-developer / 使用 seeded random 或配置常量替代
- [x] A203 global.css 中动画时长魔法数字散落（2s、3s、20s、100ms-500ms stagger），未收拢到 CSS 变量 — design-ui-designer / 将所有动画时长提取为 --duration-* CSS 变量
- [x] A204 use_overlay_controller.ts 中 entry animation 时长散落（0.7、1.05、0.4、0.35、0.3、0.8），未集中到常量文件 — engineering-frontend-developer / 提取到 layout_constants.ts 或新建 animation_constants.ts
- [!] A205 theme.ts （延后至阶段 E：架构级变更，当前主线不涉及主题切换） store 已存在但未完全消费所有令牌，CSS 自定义属性与 store 数据存在双源 — design-ux-architect / 规划主题令牌统一消费路径，消除 CSS 硬编码与 store 不同步风险
- [!] A206 DivinationOverlay.vue （延后至阶段 E：需要 UX 设计输入） 中 revealing 阶段仅显示文字提示 + 省略号动画，无进度反馈，用户可能认为卡住 — design-ux-researcher / 添加进度指示或骨架屏
- [!] A207 index.vue （延后至阶段 E：winWidth/spreadFactor 已在 A107 中清理为死代码并删除，winHeight 仍为模块级变量但 calculateLayout 始终同步调用） 中 winHeight/winWidth/spreadFactor 为模块级可变变量，非响应式，resize 后可能不一致 — engineering-frontend-developer / 改用 ref/computed 或确保 calculateLayout 始终同步
- [x] A208 ResultPanel.vue 中 heroTitleTiming/heroQuestionTiming 硬编码在组件内（180/38/420/26），未与 typewriter_model 统一 — engineering-code-reviewer / 提取到常量或使用 controller 统一管理
- [x] A209 tarot.ts store 暴露 drawCardsAndFetchReading 作为 legacy 兼容方法，内部 catch 吞错误 — engineering-code-reviewer / 评估是否仍需保留，如需保留则至少 log warning
- [x] A210 global.css 中 .sr-only 类缺少 :focus-within 变体，跳转链接无法在聚焦时显示 — testing-accessibility-auditor / 添加 .sr-only-focusable 变体

> 验收：已执行的 P2 项由独立 Agent 验证 PASS。允许将部分 P2 项标记 [!] 延后到阶段 E。

### B4：文档审计与同步

> 所有代码修复完成后，审计全部文档并统一更新，确保文档与代码对齐。
>
> 依赖：B1 + B2 + B3 全部完成。禁止在代码修复期间零散更新文档。

**文档审计检查项**：

- [x] `PRD.md` 声明的功能范围 vs 代码实际实现 → 列出偏差并修正（如 three_card/cross_spread 实际落地状态）
- [x] `docs/technical_architecture.md` 模块/术语描述 vs 代码结构 → 列出失真项并修正
- [x] `README.md` 快速开始命令可执行性 + 文档索引链接有效性 → 验证并修正
- [x] `AGENTS.md` 与 `CLAUDE.md` 内容重复/矛盾项 → 合并去重
- [x] `TODO.md` — 标记 B 阶段完成状态

> 验收：所有文档链接可访问，命令可执行，描述与代码实际状态一致。无重复、无矛盾。

### B 阶段完成标准

- [x] P0 项全部关闭
- [x] P1 项全部关闭
- [x] P2 项已处理（完成或标记延后）
- [x] B4 文档同步全部完成
- [x] 关键路径回归测试通过（`npm run type-check` + `npm test` + `npm run build:h5`）
- [ ] **阶段 B 完成判定**：全部关闭 + 文档同步 → 进入阶段 C

---

## 🧪 阶段 C：测试验证（Testing）

> 目标：整改后全链路验证。

- [ ] 全动画流程回归测试（idle → result）
- [ ] 宽屏 / 窄屏响应式测试
- [ ] H5 / 小程序多端测试
- [ ] prefers-reduced-motion 降级测试
- [ ] 性能基准测试（idle CPU、内存泄漏、重排）

### 完成标准

- [ ] 全部测试项通过并有截图/日志证据

---

## 🚀 阶段 D：部署上线（Deployment）

> 目标：交付到生产环境。

- [ ] 构建验证：`npm run build:h5` + `npm run build:app:mp`
- [ ] CI 流水线检查（type-check、lint、test、build、audit）
- [ ] 部署 H5 生产环境
- [ ] 部署小程序生产环境
- [ ] 发布 checklist 与回滚方案

### 完成标准

- [ ] 生产环境可访问
- [ ] smoke test 通过

---

## 🔮 阶段 E：后续演进（Evolution）

> 目标：当前不纳入主线，作为后续方向记录。

- [!] 牌阵扩展：three_card、cross_spread 从注册表落地到 UI
- [!] 后端解读 API 优化与缓存策略
- [!] 主题系统扩展：多主题切换、暗色模式
- [!] 动画系统性能优化：GSAP 对象池、will-change 精细化
