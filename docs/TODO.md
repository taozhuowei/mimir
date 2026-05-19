# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

清偿两笔技术债，各自独立提交、零功能变更：

1. N1 恢复失效的 `store-not-to-ui` 架构守卫——规则路径未随结构迁移更新，当前永不匹配。
2. N2 清偿「解读 → 答案」命名债——用户可见层与文档已统一为「答案」，请求生命周期管道内部标识仍为 `reading*`，统一重命名为 `answer*`。

前置上下文：结果阶段「解读 → 答案」产品转向已交付并提交 [`b5f7d9f`](../README.md)（服务端查表 + `tarot_answer.json`、前端单面板 `AnswerInscription.vue`、PRD/词表同步、e2e 对齐单面板契约、full 门禁 + e2e 15/15 + prod perf Δ-0.0% 全绿）。需求依据见 [docs/PRD.md](PRD.md) 与模块 [prd/](prd/)。

## 禁止项（决策冻结）

1. N1、N2 各自独立提交，互不混入，亦不混入任何功能改动。
2. 纯重命名 / 纯规则路径修正，禁改运行时逻辑、模板、样式、协议语义（字段重命名属协议形变，前后端必须同一提交内同步）。
3. 禁 `--no-verify`/`--force`/任何门禁绕过；每步真实跑通 [pre-commit 门禁](../README.md)。
4. 类型检查前端用 [vue-tsc 不用 tsc](../CLAUDE.md)；vitest 必带 `--dir app/test`/`--dir server/test`。

## 任务清单

> 每步：按操作改 → 验收（命令逐条 exit 0）→ 勾「进度」。N1、N2 顺序无依赖，可独立执行，各自单 commit。遇失败即停报告，按「回滚」处置。

- [ ] N1 恢复 `store-not-to-ui` 守卫
  - 实证现状：[`config/dependency-cruiser.cjs`](../config/dependency-cruiser.cjs) 第 277–283 行规则 `store-not-to-ui`，`from: ^app/src/shared/store/`、`to: ^app/src/shared/(components|views)/`。当前真实结构：store 在 [`app/src/core/store/`](../app/src/core/store)（`boot/notification/tarot/theme.ts` + `slices/{deck,flow,reading}.ts`），UI 在 `app/src/flows/<domain>/components/`。两路径在现结构均不存在 → 规则永不匹配，守卫=哑规则（既已失效，非本次回归引入）。
  - 操作：`from.path` 改为 `^app/src/core/store/`；`to.path` 改为 `^app/src/flows/[^/]+/components/`；同步规则 `comment` 文案为新路径。不放宽其余守卫。
  - 验收：`node scripts/quality_gate.js full` exit 0（含 arch:check）。守卫真实生效证伪：临时在某 `core/store/*.ts` 加一行 `import '../../flows/<某域>/components/<某组件>.vue'`，单跑 `npx depcruise`/arch:check 应报 `store-not-to-ui` 违规；删除该临时行后复跑全绿（证明非哑规则，再提交）。
  - 影响：1 配置文件。回滚：`git checkout -- config/dependency-cruiser.cjs`（未提交）/ `git revert`（已提交）。

- [ ] N2 清偿「解读 → 答案」命名债
  - 实证范围：`ReadingResult`/`ReadingCardDetail` 跨 11 文件（[`app/src/core/api/types.ts`](../app/src/core/api/types.ts)、[`server/src/services/tarot_reading.ts`](../server/src/services/tarot_reading.ts) 等）；store slice [`app/src/core/store/slices/reading.ts`](../app/src/core/store/slices/reading.ts)；composable [`use_reading_request_controller.ts`](../app/src/flows/reading/composables/use_reading_request_controller.ts)；路由响应字段 `reading`（[`server/src/routes/divinations.ts`](../server/src/routes/divinations.ts)）；完成事件 `typewriterComplete`（1 处，[`AnswerInscription.vue`](../app/src/flows/reading/components/AnswerInscription.vue)→[`use_main_stage.ts`](../app/src/flows/index/composables/use_main_stage.ts)）；`\breading\b` 散落 36 文件（含派生 `readingResult/readingPanelState/readingErrorMessage`）。
  - 重命名映射（确定）：`ReadingResult→AnswerResult`、`ReadingCardDetail→AnswerCardDetail`、`readingResult→answerResult`、slice 文件 `reading.ts→answer.ts` 及其符号、`use_reading_request_controller.ts→use_answer_request_controller.ts` 及其导出符号、协议响应字段 `reading→answer`（前后端同步，破坏性形变）、`typewriterComplete→answerRevealed`、`readingPanelState→answerPanelState`、`readingErrorMessage→answerErrorMessage`。
  - 操作：分后端（`server/src` 类型/路由/服务 + `server/test`）、前端（`app/src` store/composable/component/api + `app/test` 含 e2e 控制器命名注释）两步机械重命名；协议字段 `reading→answer` 必须在同一提交内前后端同改。每步随手对齐文件头 `Name:`/注释中的旧标识。
  - 验收：每步 `npx vue-tsc --noEmit -p app/tsconfig.json`；`npx tsc --noEmit -p server/tsconfig.json`；`npx vitest run --config app/vitest.config.ts --dir app/test`；`npx vitest run --config server/vitest.config.ts --dir server/test`；`node scripts/quality_gate.js full`；`node scripts/build/index.js --prod --target h5,server --skip-quality`（DONE + perf Δ≈0）；`npx playwright test --config=app/playwright.config.ts` 全绿。完成后删除全部 docs（[prd/](prd/)、[tarot_glossary.md](tarot_glossary.md)）内「（内部标识仍为 reading，命名债）」类括注；本文件「搁置问题」对应行同步移除。
  - 影响：约 36 文件 + docs 去括注。回滚：未提交 `git checkout --`；已提交 `git revert` N2 commit。

- [ ] N3 全局复核 + 文档收口（N1、N2 均完成后）
  - 验收：重跑 N2 全套验收命令全 exit 0；`grep -rnE "reading" app/src server/src | grep -vi "answer"` 无残留内部标识（路由/类型/store/composable/event 维度）；docs 无遗留命名债括注；本文件回到「无进行中计划」空态待下一任务重写。

## 执行约束

N1、N2 各自全绿才单 commit（message 形如 `fix(arch): repoint store-not-to-ui guard at core/store + flows components`、`refactor(naming): unify reading* internal identifiers to answer*`），禁中途 commit、禁跳步、禁门禁绕过。遇验收失败即停并报告。

## 进度

「解读 → 答案」产品转向已交付提交 `b5f7d9f`（功能 + 文档 + e2e + 门禁/perf 全绿）。N1（守卫恢复）、N2（命名债清偿）已排期，均未启动。

## 回滚

未提交：`git checkout -- <受影响文件>` 回到 `b5f7d9f`。已提交：对对应 `git revert`（N1、N2 各为独立 commit，可分别回退）。

## 搁置问题（已登记，未排期，结构迁移只搬位置未碰逻辑，根因仍在）

1. 组件职责拆分债：
   a. [`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue)：`variant: idle|fallback` 一组件三职责（文案表 `COPY` + 自管 GSAP 错落入场 + 视图语义分支）。应拆为纯文案渲染 + 入场动画驱动 + 按 variant 的薄包装。
   b. [`DevToolsPanel.vue`](../app/src/flows/index/components/DevToolsPanel.vue)：可拖拽折叠壳 + 10+ 纯 `$emit` 透传 + 拖拽/点击手势消歧混合。透传应收敛（`v-bind/v-on` 转发或下沉），拖拽抽为独立 composable，壳只管布局与可见性。
