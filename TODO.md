# TODO -- Scales Tarot

> 更新日期：2026-04-21
> 当前交付范围：H5 + `single_card`
> 执行顺序：质量门禁 -> 问题修复 -> 回归验收

## 规则与状态

| 标记 | 含义 |
|---|---|
| `[ ]` | 待开始 |
| `[~]` | 进行中 |
| `[?]` | 待验收 |
| `[x]` | 已完成 |
| `[!]` | 阻塞 / 待确认 |

- 状态严格流转：`[ ] -> [~] -> [?] -> [x]`；任一阶段如被阻塞，立即转为 `[!]` 并写明原因。
- 开始即更新：任务一旦开工，立即改为 `[~]`，禁止事后补标。
- 完成即闭环：只有存在可复核证据时才能标记 `[x]`，证据必须是命令输出、构建结果、测试结果或人工验证记录。
- 单一事实源：当前执行状态只以本文件为准；已完成事项不保留在主清单中。
- 新增固定数值必须集中到常量或配置；禁止把魔法数字散回业务代码。

## 已确认的门禁缺口与异常

- [x] 安全门禁阈值已明确：`npm audit --omit=dev --audit-level=high` 为阻断门禁；13 个 esbuild moderate 漏洞已评估并接受进入白名单，复查日期 2026-05-21。详见 `docs/AUDIT_WAIVER.md`。
- [!] 产品口径与实现不一致：`PRD.md` 仍声明支持 `single_card`、`three_card`、`cross_spread`，但 `app/src/stores/tarot.ts` 仍将 `spreadKind` 固定为 `single_card`，对应测试也在固化该行为。（**移至 G1.1 处理**）
- [!] 发布配置与主线不一致：`app/src/manifest.json` 仍硬编码 `mp-weixin.appid`，并保留相机权限；与当前 H5 主线不对齐。（**移至 G1.3 处理**）
- [!] 可访问性逻辑未真正接线：`DivinationOverlay.vue` 中已有 `overlayRef` / `handleOverlayKeydown` / `trapFocus`，但模板未绑定根节点 `ref` 与对应键盘事件。（**移至 G1.2 处理**）

## G0 质量门禁补齐

### [x] G0.1 统一本地与 CI 质量命令入口

- 目标：把 `type-check`、`lint`、`test`、`build:h5`、`build:server`、`audit`、`arch:check` 收敛为一套统一命令，避免本地、hook、CI 三套口径。
- 处理：新增统一质量运行时；本地与 CI 使用 `npm run quality` 全量模式，hook 使用 `npm run quality:staged` 快速模式，但两者必须共用同一个运行时实现；README、技术文档、CI、hook 同步引用这套入口体系。
- 验收点：`npm run quality` 已串起 `lint -> type-check -> test -> build:h5 -> audit -> arch:check`；`npm run quality:staged` 与其共用同一运行时实现；CI 只调用 `npm run quality`；pre-commit 已安装并调用 `npm run quality:staged`；统一入口返回非 0 时，必须来自真实门禁失败而不是入口缺失。
- 验收策略：执行 `npm run quality`、`npm run quality:staged`；检查 `.github/workflows/ci.yml`、`.simple-git-hooks.json` 与 `.git/hooks/*` 的实际接线；复核 README 和技术文档是否同步。

### [x] G0.2 修正 lint 覆盖范围与配置边界

- 目标：让前端、后端、测试代码的 lint 策略明确且可执行，消除"脚本声称覆盖，配置实际忽略"的假门禁。
- 处理：决定是扩展现有 ESLint 到 `server/src`，还是拆分前后端配置；同步修正 `lint` 脚本与 pre-commit。
- 验收点：`lint` 覆盖范围与配置一致；执行结果可解释；不会再出现 `server/src` 被声称检查但实际未检查。
- 验收策略：运行 `npm run lint`，并单独验证 hook 调用路径与 CI 路径一致。

### [x] G0.3 建立可用的架构门禁

- 目标：让依赖结构检查从"不可用误报"变成"可执行门禁"。
- 处理：新增 `npm run arch:check`；修正 `.dependency-cruiser.js` 对 workspace、test、类型依赖和允许例外的规则；明确哪些 warning 允许保留、哪些 error 必须阻断。
- 验收点：`arch:check` 使用仓库本地依赖可稳定执行；结果以真实结构问题为主，不再被 workspace 误报淹没。
- 验收策略：运行 `./node_modules/.bin/depcruise ...` 对比修复前后输出；保留例外说明和规则注释。

### [x] G0.4 收紧测试告警门禁

- 目标：测试通过不再等于"带 warning 的假绿"。
- 处理：为 uni-app 组件测试补齐 `scroll-view` 等运行环境处理；阻断未处理的 Vue warn / console error 静默通过。
- 验收点：组件测试通过且无未处理 warning；`DivinationOverlay` 相关测试结果干净。
- 验收策略：运行 `npm test`，检查 `divination_overlay_a6.test.ts` 与相关组件测试输出为无 warning 通过。

### [x] G0.5 明确安全与构建告警策略

- 目标：把安全漏洞和构建告警从"知道有问题"变成"有结论、有处理路径"。
- 处理：
  - `npm audit` 阻断门禁保持 `--audit-level=high`（仅阻断 high/critical）
  - 13 个 esbuild moderate 漏洞（GHSA-67mh-4wv8-2f99）经风险评估后接受进入白名单：`docs/AUDIT_WAIVER.md`
  - 风险分析：仅影响开发服务器，生产构建无暴露面；上游 `@dcloudio` 无修复版本，强制 fix 为 breaking change
  - 复查日期：2026-05-21
  - 新增 `npm run quality:audit:info`（`--audit-level=moderate`）供信息查看，不阻断 CI
  - H5 构建无字体告警，无需额外处置
- 验收点：安全风险和构建告警都有明确门禁标准；没有默认忽略项。
- 验收策略：运行 `npm audit --omit=dev` 与 `npm run build:h5`，将当前输出和处置结论写回文档 / 配置。
- 验收证据：`docs/AUDIT_WAIVER.md` 已建立；`npm run quality:audit` 通过；`npm run quality:audit:info` 可查看 moderate 详情。

## 审查发现的新问题（已规划至 G1 各波次）

> 来源：G0 阶段代码整体审查（2026-04-21）
> 原则：P0 必须进入当前阶段；P1/P2 可进 G2 或后续阶段，由规划方确认。

### P0 -- 必须立即处理

- [ ] **后端错误处理中间件失效**：`server/src/app.ts` 错误处理器签名缺少 `next` 参数（arity=3），Express 将其识别为普通中间件而非错误处理器。（**G1.4**）
- [ ] **主题加载目录遍历**：`server/src/services/theme_loader.ts` 直接将 URL 参数拼接到文件路径，存在 Path Traversal 风险。（**G1.4**）
- [ ] **`spreadSlots` 危险类型断言**：`app/src/composables/use_overlay_controller.ts:310` 用 `[] as unknown as CardLayout[]` 伪装空数组，运行时可能静默失败。（**G1.5**）
- [ ] **Controller 测试形同虚设**：`use_overlay_controller.test.ts` / `overlay_controller_sizing.test.ts` 只断言属性存在，不验证任何真实行为。（**G1.5**）
- [ ] **组件测试验证不存在的 props**：`divination_overlay_a6.test.ts` 传入 `isWide` / `cardCount` props，但组件并不声明这些 props。（**G1.7**）
- [ ] **焦点管理零测试覆盖**：`divination_overlay_a6.test.ts` 对 Tab 循环、焦点恢复等完全无测试。（**G1.2 + G1.7**）

### P1 -- 重要

- [ ] **cardId 不存在返回 500**：`routes/readings.ts` 将卡牌不存在视为内部错误返回 500，违反 HTTP 语义且泄露内部信息。（**G1.4**）
- [ ] **`prefersReducedMotion()` 重复定义**：`utils/accessibility.ts` 与 `utils/typing/typewriter_model.ts` 各有一份实现，后者 import 了但未使用。（**G1.9**）
- [ ] **`clamp()` 重复定义**：`core/layout/card_position_calculator.ts` / `scene_layout.ts` / `utils/overlay_layout/motion_metrics.ts` 三处独立定义。（**G1.9**）
- [ ] **魔法数字散落**：`RESULT_LIFT_MARGIN_PX`、`spreadX: 120`、`shuffleEdgeMargin`、`DECK_CLICK_SAFETY_MS` 等未集中管理。（**G1.9**）
- [ ] **`drawCardsAndFetchReading` 遗留死代码**：`stores/tarot.ts` 中标记为 Legacy 的方法已无生产调用。（**G1.9**）
- [ ] **`destroyed` 标志只写不读**：`reading_orchestrator.ts` 中该标志未生效，竞态/销毁守卫不完整。（**G1.9**）
- [ ] **GSAP 类型强转 x8**：所有 phase runner 返回时都写 `as unknown as AnimationTimeline`，抽象层未隔离 GSAP 细节。（**G1.6**）
- [ ] **`resolveSpreadSpec` 静默失败**：未注册牌阵返回空 `slots` 数组，调用方 `map`/`forEach` 产生空结果而非显式错误。（**G1.1**）
- [ ] **4xx 错误透传 `err.message`**：`app.ts` 错误处理器对 4xx 返回原始错误消息，未来若中间件附带敏感信息将直接暴露。（**G1.4**）
- [ ] **`overlay_pipeline.test.ts` 使用真实 `setTimeout`**：依赖真实时间而非 fake timers，CI 高负载时可能 flaky fail。（**G1.5**）
- [ ] **多个核心模块无直接测试**：`useOverlayLayout`、四个 `phase_runner`、`deck_calculator`、`OfflineReadingProvider` 等仅被间接覆盖。（**G1.5 ~ G1.7**）
- [ ] **`TypewriterText.vue` 未响应 `prefers-reduced-motion`**：model 层支持 `instant`，组件层未接入。（**G1.9**）
- [ ] **可访问性：overlay 缺少 dialog 语义**：无 `role="dialog"`、`aria-modal="true"`，屏幕阅读器用户无法感知模态层。（**G1.2**）
- [ ] **可访问性：阶段变化无实时播报**：洗牌->切牌->抽牌->解读过程，屏幕阅读器用户无法感知当前阶段。（**G1.7**）
- [ ] **可访问性：drag-handle 无键盘替代**：仅监听 touch 事件，键盘用户无法调整结果面板高度。（**G1.7**）
- [ ] **`use_overlay_controller.ts` 职责过重（729 行）**：同时承担动画编排、阅读请求生命周期、布局计算、resize 处理。需拆分为独立 composable。（**G1.5**）

### P2 -- 建议

- [ ] **CSP 完全关闭**：`app.ts` 中 `helmet({ contentSecurityPolicy: false })`，应用层无内容安全策略兜底。（**G1.4**）
- [ ] **CORS 通配模式缺少 `Vary: Origin`**：共享缓存可能返回错误缓存。（**G1.4**）
- [ ] **速率限制阈值偏宽松**：生产 120 req/min，POST /readings 等写接口可单独下调。（**G1.4**）
- [ ] **Swagger 依赖未使用**：`swagger-jsdoc` + `swagger-ui-express` 已安装但源码无引用，扩大攻击面。（**G1.4**）
- [ ] **后端常量未集中**：`server.ts` 中 `SHUTDOWN_TIMEOUT_MS`、`DEV_PORT_RETRY` 未收拢到 `config.ts`。（**G1.4**）
- [ ] **store 域未分离**：`stores/tarot.ts` 同时管理牌库数据、占卜流程、解读状态、UI 状态，职责过重。（**G1.10**）

> 注：**模块职责分离（use_overlay_controller 拆分）** 不在原有 TODO 规划中，是本次代码审查新发现的架构债务。

## G1 问题修复与架构重构

> G1 范围：原有 TODO 问题修复 + 代码审查新发现的 P0/P1 架构债务。
> 执行原则：按波次推进，每波结束后由独立验收 agent 审计，FAIL 则回流修复，PASS 才进入下一波。
> 开发主力：Kimi（执行者）调度 `engineering-frontend-developer` / `engineering-backend-architect` / `engineering-minimal-change-engineer`。
> 验收主力：`engineering-software-architect` 审模块边界；`engineering-code-reviewer` 审代码质量；`testing-accessibility-auditor` 审 a11y；`testing-test-results-analyzer` 审测试覆盖；`testing-reality-checker` 做最终回归把关。

---

### 第一波：安全、口径与配置（4 项并行，无依赖）

#### [x] G1.1 收敛牌阵口径到当前主线
- **目标**：文档、store、测试对"当前只正式交付 `single_card`，但架构保留扩展点"达成一致。
- **处理**：修正 `PRD.md` 的牌阵表述；重构 `app/src/stores/tarot.ts` 中 `ACTIVE_SPREAD_KIND` 的硬编码策略；同步调整 `test/tarot_store.test.ts` 的断言口径。
- **开发 agent**：`engineering-frontend-developer`
- **验收 agent**：`engineering-code-reviewer` + `testing-test-results-analyzer`
- **验收点**：`PRD.md`、运行时实现、测试断言三者一致；新增牌阵时不需要再改核心流程主干。
- **验收策略**：运行相关单测并复核 `PRD.md` / `spread_registry.ts` / `tarot.ts` 的表达一致性。

#### [x] G1.2 修复 overlay 焦点管理接线
- **目标**：让 `DivinationOverlay` 中已有的焦点陷阱逻辑真正生效。
- **处理**：为 overlay 根节点绑定 `:ref` / `@keydown` 和必要 ARIA 语义（`role="dialog"`、`aria-modal="true"`）；补组件级测试覆盖 Tab 循环、关闭后焦点恢复。
- **开发 agent**：`engineering-frontend-developer`
- **验收 agent**：`testing-accessibility-auditor` + `testing-test-results-analyzer`
- **验收点**：`Tab` / `Shift+Tab` 不逃出 overlay；关闭后焦点恢复；组件测试无 warning。
- **验收策略**：运行组件测试，并在 H5 页面手动验证键盘导航。

#### [x] G1.3 清理发布配置与权限声明
- **目标**：让 `manifest.json` 与当前 H5 主线一致。
- **处理**：移除或环境化 `mp-weixin.appid`；清理 CAMERA 等无关权限；同步文档发布范围说明。
- **开发 agent**：`engineering-minimal-change-engineer`
- **验收 agent**：`compliance-auditor`
- **验收点**：发布配置不再携带 H5 无关硬编码和权限；文档与配置一致。
- **验收策略**：复核 `manifest.json`、执行 `npm run build:h5`。

#### [x] G1.4 后端安全修复（审查新发现 P0/P1）
- **目标**：修复代码审查中发现的 5 个后端安全与配置问题。
- **处理**：
  1. `app.ts` 错误处理中间件补 `next` 参数（`arity=4`）
  2. `app.ts` 4xx 错误不再透传 `err.message`
  3. `theme_loader.ts` 主题 ID 做白名单校验，防止 Path Traversal
  4. `routes/readings.ts` 卡牌不存在时返回 400（非 500），且不透传内部错误消息
  5. `server.ts` 常量收拢到 `config.ts`
- **开发 agent**：`engineering-backend-architect`
- **验收 agent**：`engineering-security-engineer` + `testing-test-results-analyzer`
- **验收点**：错误中间件 arity=4；`../../../etc/passwd` 被拦截；不存在的 cardId 返回 400 + 通用文案；常量集中管理。
- **验收策略**：运行 `test/testcases/api.test.ts` 和 `test/testcases/backend.test.ts`；手动验证 theme 路由边界。

---

### 第二波：上帝对象拆分（3 项串行，核心重构）

> **前置条件**：第一波全部验收通过，质量门禁无新增例外。

#### [ ] G1.5 拆分 `use_overlay_controller.ts`（729 行 -> 3 个独立 composable + 1 facade）
- **目标**：消除最大上帝对象，让动画、阅读、布局各自独立。
- **拆分后结构**：
  - `composables/use_animation_controller.ts` -- 动画编排（entry、pipeline、phase runner 衔接）
  - `composables/use_reading_controller.ts` -- 阅读请求生命周期（start/retry/finish/reset）
  - `composables/use_overlay_controller.ts` -- facade，只负责协调上述两者 + 暴露模板接口
- **开发 agent**：`engineering-frontend-developer`（主）+ `engineering-software-architect`（架构确认）
- **验收 agent**：`engineering-software-architect`（模块边界）+ `engineering-code-reviewer`（代码质量）+ `testing-test-results-analyzer`（测试覆盖）
- **验收点**：
  - `use_animation_controller.ts` 不 import `reading/` 任何模块
  - `use_reading_controller.ts` 不 import `gsap`
  - facade 行数 < 200
  - 所有现有测试通过，无新增 warning
- **验收策略**：运行 `npm test` + `npm run arch:check`；审查 import 依赖图。

#### [ ] G1.6 拆分 `use_animation_state.ts`（191 行 -> 4 个引擎模块）
- **目标**：动画状态、样式刷新、可见性控制、GSAP 适配各自独立。
- **拆分后结构**：
  - `animation/engine/animation_state.ts` -- GSAP target 对象管理（与 Vue 解耦）
  - `animation/engine/style_reconciler.ts` -- GSAP state -> Vue style refs 同步
  - `animation/engine/visibility_controller.ts` -- lefts/piles/draws 可见性 flags
  - `animation/engine/gsap_adapter.ts` -- 统一 GSAP 包装，消灭 8 处 `as unknown as`
- **开发 agent**：`engineering-frontend-developer`
- **验收 agent**：`engineering-software-architect` + `engineering-code-reviewer`
- **验收点**：
  - `animation/engine/*` 零 Vue 组件 import
  - `gsap_adapter.ts` 是唯一接触 GSAP 的底层文件
  - 无新增 `as unknown as`
- **验收策略**：Grep 检查 `as unknown as` 数量；运行测试；审查 `animation/engine/` 目录依赖方向。

#### [ ] G1.7 拆分 `DivinationOverlay.vue`（977 行 -> 5 个子组件 + 精简主组件）
- **目标**：模板层按视觉区域拆分，每个子组件可独立测试。
- **拆分后结构**：
  - `components/overlay/ProgressHeader.vue` -- 阶段进度条
  - `components/overlay/StageDeck.vue` -- 牌堆舞台（洗牌/切牌/抽牌/翻牌视觉区域）
  - `components/overlay/ResultZone.vue` -- 结果面板容器
  - `components/overlay/ResultDragHandle.vue` -- 拖拽手柄（触摸高度调节 + 键盘替代）
  - `components/overlay/ActionBar.vue` -- 底部操作栏（再占一次 / 回到首页）
  - `components/DivinationOverlay.vue` -- 精简为 orchestrator，只负责组合上述子组件 + 绑定焦点管理
- **开发 agent**：`engineering-frontend-developer`
- **验收 agent**：`testing-accessibility-auditor` + `testing-test-results-analyzer`
- **验收点**：
  - 每个子组件有独立测试或至少 mount 测试
  - `DivinationOverlay.vue` script 部分 < 150 行
  - 焦点管理、键盘导航无回归
- **验收策略**：运行组件测试；手动验证 H5 键盘导航和拖拽。

---

### 第三波：目录重组与清理（3 项并行）

> **前置条件**：第二波全部验收通过。

#### [ ] G1.8 重组 animation 目录体系
- **目标**：`utils/overlay_animation/` 与 `core/flow/phases/` 合并到统一的 `animation/` 目录，消除目录边界混乱。
- **处理**：
  - `utils/overlay_animation/pipeline.ts` -> `animation/orchestration/pipeline.ts`
  - `utils/overlay_animation/timeline_orchestrator.ts` -> `animation/orchestration/timeline_master.ts`
  - `utils/overlay_animation/phase_registry.ts` -> `animation/orchestration/phase_registry.ts`
  - `core/flow/phases/*.ts` -> `animation/phases/*/`（每个 phase 一个子目录，含 builder.ts + config.ts）
  - 删除 `utils/overlay_animation/` 目录
- **开发 agent**：`engineering-frontend-developer`
- **验收 agent**：`engineering-software-architect` + `engineering-code-reviewer`
- **验收点**：`animation/` 目录下无业务逻辑泄露；`arch:check` 无新增违规。

#### [ ] G1.9 清理死代码与重复代码
- **目标**：消除审查中发现的重复函数、死代码、遗留方法。
- **处理清单**：
  1. 删除 `stores/tarot.ts` 中 `drawCardsAndFetchReading` legacy 方法
  2. 删除 `reading_orchestrator.ts` 中未生效的 `destroyed` 标志（或使其生效）
  3. 统一 `prefersReducedMotion()` 到 `utils/accessibility.ts`，删除 `typewriter_model.ts` 中的本地副本
  4. 统一 `clamp()` 到 `core/math.ts`（或 `utils/clamp.ts`），删除三处重复定义
  5. 删除 `utils/result_panel.ts`（已合并到 presenter）
  6. 删除 `composables/use_result_panel_controller.ts` 中未使用的 `useTypewriterController` 导出
  7. 集中散落魔法数字：`RESULT_LIFT_MARGIN_PX`、`spreadX: 120`、`shuffleEdgeMargin`、`DECK_CLICK_SAFETY_MS`
- **开发 agent**：`engineering-minimal-change-engineer`
- **验收 agent**：`engineering-code-reviewer`
- **验收点**：每项清理都有对应的测试调整；全量测试通过；无功能回归。

#### [ ] G1.10 拆分 `stores/tarot.ts` 数据域
- **目标**：按数据域拆分 store，避免一个 store 管理所有全局状态。
- **拆分后结构**（方案待架构确认）：
  - `stores/divination.ts` -- 占卜流程状态（phase、question、drawnCards）
  - `stores/reading.ts` -- 解读状态（readingResult、readingError、isReadingLoading）
  - `stores/deck.ts` -- 牌库状态（allCards、isCardsLoading、cardsLoadError）
  - `stores/tarot.ts` -- facade，保持现有接口向后兼容（或逐步迁移调用方）
- **开发 agent**：`engineering-frontend-developer` + `engineering-software-architect`（确认拆分边界）
- **验收 agent**：`engineering-software-architect` + `testing-test-results-analyzer`
- **验收点**：
  - 每个新 store 职责单一，无循环依赖
  - 所有现有测试通过
  - `arch:check` 无新增违规
- **验收策略**：运行全量测试；审查 store 间依赖图。

---

### 第四波：回归验收（1 项）

> **前置条件**：第三波全部验收通过。

#### [ ] G1.11 G1 阶段全量回归
- **目标**：确认 G1 全部修改后，主线质量仍能被门禁稳定拦截。
- **处理**：
  1. 运行 `npm run quality`（lint -> type-check -> test -> build:h5 -> audit -> arch:check）
  2. 运行 E2E 脚本：`test/e2e_divination_flow.sh` + `test/e2e_network_error.sh`
  3. H5 手动验证：焦点管理、键盘导航、拖拽、窄屏/宽屏布局
- **开发 agent**：Kimi（执行者）
- **验收 agent**：`testing-reality-checker`（最终把关）+ `testing-test-results-analyzer`
- **验收点**：
  - 质量门禁 exit code 0，无未处理 warning
  - E2E 脚本通过
  - 手动验证记录留存
- **验收策略**：保留所有命令输出作为验收证据。

## G2 回归验收

### [ ] G2.1 自动化回归

- 目标：确认门禁补齐和问题修复后，主线质量能被自动化稳定拦截。
- 处理：集中执行类型检查、lint、测试、架构检查、H5 构建、服务端构建。
- 验收点：所有质量命令一次性通过；无未处理 warning；无新增门禁例外。
- 验收策略：按统一质量命令执行；保留命令输出作为验收证据。

### [ ] G2.2 关键路径与错误路径验证

- 目标：确认首页 -> 占卜 -> 结果，以及错误恢复路径都与新门禁要求一致。
- 处理：启动开发服务器，执行正常路径与网络错误路径脚本；必要时补充人工键盘和响应式验证。
- 验收点：`test/e2e_divination_flow.sh` 与 `test/e2e_network_error.sh` 均通过；H5 手动验证无焦点和布局回归。
- 验收策略：运行脚本化 E2E；补充手动验证记录，重点检查焦点管理、错误恢复、窄屏 / 宽屏布局。
