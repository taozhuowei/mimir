# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

「解读 → 答案」收尾：先清 pivot 删 UI 后残留的死分支与过时文档/注释，再把活代码内部标识 `reading*` 统一改名为 `answer*`。**纯重命名 / 删死分支 / 改文档，零运行时行为变更**（协议字段已在 S1 完成）。

实证修正（关键）：pivot 残留中**可安全删除的死代码很少**——仅宽屏分栏布局分支（`viewport_scene_layout` 的 `stageWidth = showResults&&wide ? width - WIDE_SIDE_DRAWER_WIDTH_PX : width` 及 `wide_breakpoint_and_chrome` 的 `WIDE_SIDE_DRAWER_WIDTH_PX/sideDrawerWidth`，已实证 `app/src/flows`+`core/composables` 零消费、注释自承 legacy 待删）。其余 `reading` 标识（`reading_stage` 场景、`cardWidthFull`、`openReadingPanel`、orchestrator/controller/store/event）均为**活代码**，正确处理是改名而非删除；`cardWidthFull` 等语义过时但值仍被活代码消费，**只改名/改注释，不动逻辑**。

前置已交付：pivot `b5f7d9f`；守卫 `e4555ca`；孤儿+README `450d76a`；S1 数据契约+协议字段 `85e4360`。

## 阶段与确定性清册（冻结）

### C1 文档/注释（零运行时，先做）

1. PRD 视图模型债：[`prd/glossary.md`](prd/glossary.md) 18/19/29（分栏/抽屉/答案面板）、[`prd/view.md`](prd/view.md) 视图与容器节、[`prd/animation.md`](prd/animation.md) 第二段过渡（宽屏分栏/窄屏抽屉分支）、[`prd/state.md`](prd/state.md) 视图映射——按 pivot 后实际「单一行内 `.answer-zone`，无分栏/抽屉/面板」重写。
2. 过时代码注释（描述已删机制，改写为现状，不改代码）：[`MainSurface.vue`](../app/src/flows/index/components/MainSurface.vue) 头注释（ReadingSplit/Drawer overlaid）、[`create_main_transition_handlers.ts`](../app/src/flows/index/composables/create_main_transition_handlers.ts) `MainHandlers` 注释段（useActiveView/ReadingPanel/.error-box）、[`viewport_scene_layout.ts`](../app/src/core/sizing/overlay_layout/viewport_scene_layout.ts) / [`wide_breakpoint_and_chrome.ts`](../app/src/core/sizing/overlay_layout/wide_breakpoint_and_chrome.ts) / [`layout_solver_types.ts`](../app/src/core/sizing/layout_solver_types.ts)（"before the drawer mounts" 等已无 drawer 的注释）。

### C2 删宽屏分栏死布局分支（低-中风险）

`viewport_scene_layout.ts` 的 wide 缩减分支化简为 `stageWidth = viewport.width`；删 `wide_breakpoint_and_chrome.ts` 的 `WIDE_SIDE_DRAWER_WIDTH_PX`/`sideDrawerWidth` 及其导出/消费。执行前实证 `core/sizing` 内部亦无依赖；删后全套验收+e2e 兜底。

### C3 活代码改名：请求管道 / 控制器 / store / 事件

类型：`ReadingProvider|ProviderType|Request|Status|Orchestrator|OrchestratorDeps|OrchestratorState`→`Answer*`；`UseReadingControllerFn|Return|Deps`、`DevReadingController`→`UseAnswerController*`/`DevAnswerController`。
函数：`createReadingOrchestrator|RuleBasedReadingProvider|createReadingState|useReadingController|requestReading|resetReading|retryReading|destroyReading|onResetReading|onDestroyReading|startReading`→`*Answer*`。
字段/变量：`readingResult|readingError|getReadingResult|isReadingLoading|readingPanelState|readingErrorMessage|readingController|isReadingFailed|storeReadingResult|storeReadingError|waitForReadingResult|currentReadingPromise|pendingReadingPromise|getReadingPromise|setReadingPromise|currentReadingRequestId|invalidateReadingRequest`→`*Answer*`。
事件：`typewriterComplete`/`@typewriter-complete`/`handleTypewriterComplete`→`answerRevealed`/`@answer-revealed`/`handleAnswerRevealed`。
动画揭示命令：`openReadingPanel`→`openAnswer`、`showReadingView`→`showAnswerView`。
测试 helper：`makeReadingResult`→`makeAnswerResult`。
全用 `\bSYM\b` 词边界批量；kebab 模板属性单独处理；vue-tsc/tsc 兜底补 kebab/遗漏。

### C4 活代码改名：`reading_stage` 场景全链

`'reading_stage'`→`'answer_stage'`（`SceneKind`、`solveLayout` dispatch、`getSceneLayout('reading_stage')` 调用、e2e/animation 若引用）、`solveReadingStageLayout`→`solveAnswerStageLayout`、`readingStageReservation`→`answerStageReservation`、`layout_solver_types` 中 Reading-scene 注释。

### C5 文件/目录重命名 + import + 配置

`git mv`：`slices/reading.ts→answer.ts`；`core/utils/reading/→core/utils/answer/`（`*_orchestrator/_provider/rule_based_*`）；`tarot_reading_types_shim.ts→tarot_answer_types_shim.ts`；`layout_solver_reading.ts→layout_solver_answer.ts`；`flows/reading/→flows/answer/`（`use_reading_request_controller.ts→use_answer_request_controller.ts`）；`flows/divination/composables/skip_to_reading.ts→skip_to_answer.ts`；`server/src/services/tarot_reading.ts→tarot_answer.ts`；`app/test/reading_orchestrator{,_retry}.test.ts→answer_orchestrator{,_retry}.test.ts`。同步全部 import 路径、文件头 `Name:`/路径注释、`README.md`、`dependency-cruiser.cjs` `animation-not-to-reading→animation-not-to-answer`（名+comment+`to:^app/src/core/utils/reading/→answer/`）+ 354 注释、`env.d.ts`。一次性改全（中间态不可编译）。

### C6 应用阶段标识 `reading→answer`

`DivinationPhase` `'reading'→'answer'`、全部 `=== 'reading'`/`= 'reading'`、`enterReading→enterAnswer`、`skipToReading→skipToAnswer`、`skipToReadingCommand→skipToAnswerCommand`、`handleDevSkipToReading→handleDevSkipToAnswer`、相关注释 "reading phase/decision"。e2e 经实证不锚 phase 值；CSS `.reading-panel` 负向断言属禁复活守卫，不动。

### C7 docs 去括注 + 收口

清除 `prd/*`、`tarot_glossary.md`、本文件全部「（内部标识仍为 reading，命名债）」类括注（去后句子须仍正确）。复核 `grep -rnE "\\bReading|\\breading\\b" app/src server/src` 仅剩允许残留（CSS `.reading-panel`、塔罗英文术语）。本文件回「无进行中计划」空态。

## 禁止项（冻结）

1. C3–C6 纯重命名/移动；C2 仅删确证零消费死分支；C1 仅改文档/注释。**禁改任何运行时逻辑、模板结构、样式、协议语义、布局算法（`cardWidthFull` 等语义过时也只改名/注释不动逻辑）**。
2. 每步结束必须可编译、测试全绿才提交；不可编译的中间态（C5、协议类）该步一次性改全再验收，禁中途提交。
3. 禁 `--no-verify`/`--force`/任何门禁绕过；前端类型检查用 [vue-tsc 不用 tsc](../CLAUDE.md)；vitest 必带 `--dir`。
4. 每步独立单 commit。验收套件 = `vue-tsc(app)` + `tsc(server)` + `vitest(app)` + `vitest(server)` + `node scripts/quality_gate.js full` + `node scripts/build/index.js --prod --target h5,server --skip-quality`（DONE+perfΔ≈0） + `npx playwright test`（15/15）。遇失败即停报告。

## 任务清单

- [ ] C1 文档/注释（详见上）。message：`docs: rewrite view model to inline answer-zone; fix stale comments`。
- [ ] C2 删宽屏分栏死布局分支。message：`refactor(layout): drop dead wide-split stage-width branch`。
- [ ] C3 请求管道/控制器/store/事件改名。message：`refactor(naming): rename answer-pipeline symbols + completion event`。
- [ ] C4 `reading_stage`→`answer_stage` 场景全链。message：`refactor(naming): rename reading_stage scene to answer_stage`。
- [ ] C5 文件/目录重命名 + import + 配置。message：`refactor(naming): move reading files/dirs to answer + repoint imports & arch rule`。
- [ ] C6 应用阶段标识 `reading→answer`。message：`refactor(naming): rename app phase identifier reading→answer`。
- [ ] C7 docs 去括注 + 收口。message：`docs: drop reading naming-debt annotations after rename`。

## 回滚

每步未提交：`git checkout -- .`（+ 还原 `git mv`）。已提交：对对应步 `git revert`（各步独立 commit，可分别回退）。

## 进度

S1（数据契约+协议字段）已完成提交 `85e4360`。S2 旧计划执行中发现冻结映射严重不完整且与 pivot 死代码/视图模型债纠缠，已回滚脏态、穷尽实证、按实证重排为 C1–C7。C1 起未启动。

## 搁置问题（已登记，未排期）

1. 组件职责拆分债：
   a. [`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue)：`variant: idle|fallback` 一组件三职责。应拆为纯文案渲染 + 入场动画驱动 + 按 variant 薄包装。
   b. [`DevToolsPanel.vue`](../app/src/flows/index/components/DevToolsPanel.vue)：可拖拽折叠壳 + 10+ 纯 `$emit` 透传 + 拖拽/点击手势消歧混合。透传收敛、拖拽抽 composable、壳只管布局可见性。
2. `cardWidthFull/cardHeightFull` 双卡尺寸语义债：pivot 删抽屉后「抽屉挂载前/后」双尺寸概念已无实际区分（`cardWidthFull` 仍被 `pipeline_builder` 当 `resultCardWidth` 用）。本计划只改名/注释不动逻辑；是否将其与 `cardWidth` 合一属布局逻辑简化，单列另案。
