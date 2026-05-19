# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

清偿「解读 → 答案」命名债 N2：用户可见层与产品文档已统一为「答案」，但请求数据契约 / 生命周期管道 / 应用阶段标识内部仍为 `reading*`。本计划把全部内部标识、文件名、目录名、配置路径、文档括注统一重命名为 `answer*`。**纯重命名，零运行时 / 模板 / 样式 / 协议语义变更**（协议字段 `reading→answer` 是 key 形变，前后端必须同一提交内同步，行为不变）。

前置：「解读 → 答案」产品转向已交付 [`b5f7d9f`](../README.md)；架构守卫恢复 [`e4555ca`](../README.md)；孤儿清理 + README 树对齐 [`450d76a`](../README.md)。需求依据见 [docs/PRD.md](PRD.md) 与 [prd/](prd/)。

## 确定性重命名映射（冻结，全程一致）

类型：`ReadingResult→AnswerResult`、`ReadingCardDetail→AnswerCardDetail`、`ReadingProvider→AnswerProvider`、`ReadingProviderType→AnswerProviderType`、`ReadingRequest→AnswerRequest`、`ReadingStatus→AnswerStatus`、`ReadingOrchestrator→AnswerOrchestrator`、`ReadingOrchestratorDeps→AnswerOrchestratorDeps`、`ReadingOrchestratorState→AnswerOrchestratorState`。

函数 / 工厂：`buildReading→buildAnswer`、`createReadingOrchestrator→createAnswerOrchestrator`、`RuleBasedReadingProvider→RuleBasedAnswerProvider`、`createReadingState→createAnswerState`、`useReadingController→useAnswerController`、`enterReading→enterAnswer`、`skipToReading→skipToAnswer`、`handleDevSkipToReading→handleDevSkipToAnswer`、`handleTypewriterComplete→handleAnswerRevealed`。

状态字段 / 变量：`readingResult→answerResult`、`readingError→answerError`、`getReadingResult→getAnswerResult`、`isReadingLoading→isAnswerLoading`、`readingPanelState→answerPanelState`、`readingErrorMessage→answerErrorMessage`、`readingController→answerController`。

事件：`typewriterComplete→answerRevealed`（含模板 `@typewriter-complete→@answer-revealed`）。

阶段值：`DivinationPhase` 联合 `'reading'→'answer'`，全部 `=== 'reading'` / `= 'reading'` 同步。

协议字段：响应 `reading→answer`（[`server/src/services/tarot_reading.ts`](../server/src/services/tarot_reading.ts) 返回、[`server/src/routes/divinations.ts`](../server/src/routes/divinations.ts)、[`app/src/core/api/types.ts`](../app/src/core/api/types.ts) `DivinationResponse`、[`app/src/core/api/divinations.ts`](../app/src/core/api/divinations.ts) hydrate、[`server/test/api.test.ts`](../server/test/api.test.ts) `res.body.reading.*`）。

文件 / 目录（S3 git mv）：`core/store/slices/reading.ts→slices/answer.ts`；`core/utils/reading/{reading_orchestrator,reading_provider,rule_based_reading_provider}.ts→core/utils/answer/{answer_orchestrator,answer_provider,rule_based_answer_provider}.ts`；`core/utils/tarot_reading_types_shim.ts→tarot_answer_types_shim.ts`；`core/sizing/layout_solver_reading.ts→layout_solver_answer.ts`（非孤儿，被 `layout_solver.ts` 引用）；`flows/reading/→flows/answer/`（`use_reading_request_controller.ts→use_answer_request_controller.ts`，余文件名不含 reading 随目录平移）；`flows/divination/composables/skip_to_reading.ts→skip_to_answer.ts`；`server/src/services/tarot_reading.ts→tarot_answer.ts`；`app/test/reading_orchestrator{,_retry}.test.ts→answer_orchestrator{,_retry}.test.ts`。

配置 / 声明：[`config/dependency-cruiser.cjs`](../config/dependency-cruiser.cjs) 规则 `animation-not-to-reading→animation-not-to-answer`（名 + comment + `to: ^app/src/core/utils/reading/→^app/src/core/utils/answer/`，守卫语义不变）、第 354 行注释；[`app/src/env.d.ts`](../app/src/env.d.ts) `readingResult: ...ReadingResult`；[`app/src/README.md`](../app/src/README.md) 全部 reading 路径与「解读」措辞。`knip` / `quality_baseline` 经实证无需改（通配覆盖、无 reading）。dependency-cruiser 无处枚举 `reading` 域名，`flows/reading→flows/answer` 不动正则（已实证）。

## 禁止项（决策冻结）

1. 纯重命名 / 移动 / 改 import 路径 / 文件头 `Name:` 与注释路径对齐；**禁改任何运行时逻辑、模板结构、样式、协议语义**。
2. 每步结束必须可编译、测试全绿才提交；步内若中间态不可编译（如协议字段、文件改名），该步一次性改全再验收，禁中途提交。
3. 禁 `--no-verify`/`--force`/任何门禁绕过；前端类型检查用 [vue-tsc 不用 tsc](../CLAUDE.md)；vitest 必带 `--dir`。
4. `glossary.md` 第 18/19/29 行描述 pivot 已删的分栏/抽屉/答案面板视图，属 pivot 视图模型文档债（见搁置问题 #2），**不并入 N2**，N2 不重写其句子、不去其括注。

## 任务清单

> 每步：按操作改 → 验收（命令逐条 exit 0）→ 勾「进度」。每步独立单 commit。验收套件 = `npx vue-tsc --noEmit -p app/tsconfig.json` + `npx tsc --noEmit -p server/tsconfig.json` + `npx vitest run --config app/vitest.config.ts --dir app/test` + `npx vitest run --config server/vitest.config.ts --dir server/test` + `node scripts/quality_gate.js full` + `node scripts/build/index.js --prod --target h5,server --skip-quality`（DONE + perf Δ≈0） + `npx playwright test --config=app/playwright.config.ts`（15/15）。遇失败即停报告，按「回滚」处置。

- [ ] S1 L1 数据契约符号 + 协议字段（不改文件名/目录）：按映射改 `ReadingResult`/`ReadingCardDetail`/`buildReading`、协议响应字段 `reading→answer`（前后端 + server/test 同步）、`tarot_reading_types_shim.ts` 再导出符号。验收全套。message：`refactor(naming): rename Reading result contract + response field to answer`。
- [ ] S2 L2 管道符号 + 事件（不改文件名/目录）：`AnswerProvider/AnswerRequest/AnswerStatus/AnswerOrchestrator*`、`createAnswerOrchestrator/RuleBasedAnswerProvider/createAnswerState/useAnswerController`、store 状态字段族、`env.d.ts`、事件 `typewriterComplete→answerRevealed`（含模板属性与 handler）。验收全套。message：`refactor(naming): rename answer-pipeline symbols + completion event`。
- [ ] S3 L3a 文件/目录重命名：按映射 `git mv` 全部文件与目录，重写所有消费方 import 路径、文件头 `Name:`/注释路径、`README.md` 路径与「解读」措辞、`dependency-cruiser.cjs` `animation-not-to-answer` 规则与 354 注释、`env.d.ts` import。该步一次性改全（中间态不可编译）。验收全套。message：`refactor(naming): move reading files/dirs to answer + repoint imports & arch rule`。
- [ ] S4 L3b 阶段标识值：`DivinationPhase` `'reading'→'answer'`、全部阶段比较/赋值、`enterReading/skipToReading/handleDevSkipToReading` 等阶段符号、注释 "reading phase/decision"。e2e 经实证不锚 phase 值、CSS 负向断言 `.reading-panel` 属禁复活守卫不动。验收全套。message：`refactor(naming): rename app phase identifier reading→answer`。
- [ ] S5 docs 去括注 + 措辞统一 + 收口：`prd/state.md`(11,35)、`prd/animation.md`(145,166)、`prd/glossary.md`(61,67)、`tarot_glossary.md` 及其它「（内部标识仍为 reading，命名债）」类括注全清（去后句子须仍正确）；`glossary.md`(18,19,29) 不动（搁置 #2）。复核 `grep -rnE "\\bReading|\\breading\\b" app/src server/src` 仅剩允许残留（CSS 类 `.reading-panel` 负向断言、塔罗英文术语）。本文件回「无进行中计划」空态、移除 N2 行。验收全套。message：`docs: drop reading naming-debt annotations after rename`。

## 回滚

每步未提交：`git checkout -- .` + 还原 `git mv`。已提交：对对应步 `git revert`（S1–S5 各独立 commit，可分别回退；S3 含 mv，revert 同样可逆）。

## 搁置问题（已登记，未排期）

1. 组件职责拆分债（结构迁移只搬位置未碰逻辑，根因仍在）：
   a. [`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue)：`variant: idle|fallback` 一组件三职责（文案表 `COPY` + 自管 GSAP 错落入场 + 视图语义分支）。应拆为纯文案渲染 + 入场动画驱动 + 按 variant 的薄包装。
   b. [`DevToolsPanel.vue`](../app/src/flows/index/components/DevToolsPanel.vue)：可拖拽折叠壳 + 10+ 纯 `$emit` 透传 + 拖拽/点击手势消歧混合。透传应收敛（`v-bind/v-on` 转发或下沉），拖拽抽为独立 composable，壳只管布局与可见性。

2. pivot 视图模型文档债：[`docs/prd/glossary.md`](prd/glossary.md) 第 18/19/29 行仍按 pivot 前三视图模型描述「结果分栏视图 / 结果抽屉视图 / 答案面板」，而 `b5f7d9f` 已将结果呈现改为单一行内 `.answer-zone`（无分栏 / 抽屉 / 面板）。需按 pivot 后实际视图模型重写 glossary 视图/容器节，并连带核查 `prd/view.md`、`prd/animation.md` 第二段过渡是否同有分栏/抽屉残留。属 pivot 文档同步债，与命名债性质不同，单列。
