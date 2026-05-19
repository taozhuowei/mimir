# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

结果阶段产物由「解读」转向「答案」：取消逐字打字机解读、吉凶评分与逐张牌义，结果阶段只呈现一张**答案卡**——按抽到牌的正/逆位返回一句名句的原文 `quote` / 翻译 `translation` / 来源 `source`。删除分栏视图与抽屉视图，答案改为行内（卡下 `.answer-zone`，全宽统一，无侧栏无抽屉）。请求生命周期管道零 diff：协议/状态标识 `reading`、`ReadingResult`、路由 `reading` 字段、`use_reading_request_controller`、store `reading` slice、完成事件 `typewriterComplete` 一律保留（命名债，见搁置问题 #2）。

需求依据：[docs/PRD.md](PRD.md) 及模块 [product.md](prd/product.md) [state.md](prd/state.md) [view.md](prd/view.md) [animation.md](prd/animation.md) [glossary.md](prd/glossary.md)；领域口径见 [docs/tarot_glossary.md](tarot_glossary.md)。

## 范围与契约（确定）

1. 数据单一真源：[`server/src/data/tarot_answer.json`](../server/src/data/tarot_answer.json)（version 5），`cards` 按牌 id 索引，每张含 `upright`/`reversed` 数组，元素 `{quote, source, translation, translationSource}`；`translationSource` 不入协议。78 键与 [`card_loader`](../server/src/services/card_loader.ts) 78 牌 id 一一对应（已实证：无缺失/多余/重复，槽位均非空）。
2. 按花色卡 JSON（[major](../server/src/data/tarot-major.json) [wands](../server/src/data/tarot-wands.json) [cups](../server/src/data/tarot-cups.json) [swords](../server/src/data/tarot-swords.json) [pentacles](../server/src/data/tarot-pentacles.json)）只保留卡面数据（id/name/image/...），删除 `upright`/`reversed` 牌义与 `sentiment`。
3. 服务端 [`tarot_reading.ts`](../server/src/services/tarot_reading.ts)：`generateReading`→`buildReading`，去评分，改 id+位查 `tarot_answer.json`；未知 id 或缺槽抛错（数据损坏才会触发，非合法请求路径）。
4. 前端唯一答案组件 [`AnswerInscription.vue`](../app/src/flows/reading/components/AnswerInscription.vue)：自持 loading/error/success，success 渲染 `.ai-quote`/翻译/来源分段 rise-in，入场约 1.06s（prefers-reduced-motion 立即），settle 后发 `typewriterComplete` 推进 reading→decision。挂于 [`MainSurface.vue`](../app/src/flows/index/components/MainSurface.vue) 的 `.answer-zone`（`phase ∈ {reading,decision}`），与既有 [`ActionArea.vue`](../app/src/flows/reading/components/ActionArea.vue) 同列。
5. 删除：`ReadingPanel/ReadingSplitView/ReadingDrawerView/CardMeaningContainer/ConclusionContainer/ReadingTextContainer.vue`、`reading_result_presenter.ts`、`use_reading_panel_view_model.ts`、`use_result_card_shrink.ts`、`reading_panel_timing.ts`、`use_active_view.ts` 及对应测试（`reading_result_presenter/result_panel/typewriter_model.test.ts`）。

## 禁止项（决策冻结）

1. 请求生命周期管道命名零改（`reading*` 内部标识全留），仅结果阶段产物语义与 UI 改。命名债单列搁置问题 #2，本计划不动。
2. 禁 `--no-verify`/`--force`/任何门禁绕过；单 commit 必须真实跑通 [pre-commit 门禁](../README.md)。
3. e2e 修正只对齐新单面板 DOM 契约，不对已删组件做任何假断言（[测试一致性](../CLAUDE.md)）。

## 任务清单

> 每步：按操作改 → 验收（命令逐条 exit 0）→ 勾「进度」。全部通过后单 commit。遇失败即停报告，按「回滚」处置。

- [x] P1 服务端 + 数据：新增 `tarot_answer.json`，按花色 JSON 去牌义，`buildReading` 改查表，`card_loader`/路由/类型去 `TarotCardMeaning`。验收：`npx tsc --noEmit -p server/tsconfig.json`、`npx vitest run --config server/vitest.config.ts --dir server/test` exit 0。
- [x] P2 前端：新增 `AnswerInscription.vue`，`MainSurface`/`use_main_stage`/`StageDeck` 接线为 `.answer-zone`，删 6 组件 + 4 composable + 2 测试。验收：`npx vue-tsc --noEmit -p app/tsconfig.json`、`npx vitest run --config app/vitest.config.ts --dir app/test` exit 0。
- [x] P3 类型/shim/文档：`api/types.ts`（`AnswerEntry`，`ReadingCardDetail.answer`，去 `result/score`）、`tarot_reading_types_shim.ts`、PRD 全模块 + `tarot_glossary.md` 同步为「答案」，命名债以括注登记。验收：`node scripts/quality_gate.js full` exit 0。
- [ ] P4 e2e 对齐新单面板契约（[viewport_smoke](../app/test/e2e/viewport_smoke.spec.ts) [divination_flow](../app/test/e2e/divination_flow.spec.ts) [network_error](../app/test/e2e/network_error.spec.ts)）：
  - `divination_flow`：成功锚 `.reading-panel`→`.answer-zone` attached + `.ai-quote` visible，更新头注。
  - `viewport_smoke`：成功锚同上；删除 pc/mobile 分栏-抽屉二分契约（`.reading-split-view`/`.reading-drawer-view__sheet` 组件已删），改为每视口断言 `.answer-zone` 可见含 `.ai-quote` 且在视口内不被裁剪；保留 12 视口截图与卡宽 ≤240；移除 DRAWER/SPLIT 常量与 mode 分支。
  - `network_error`：`重试读取` 文案锚仍命中（`ActionArea` 错误态），仅更新「result drawer」过时注释。
  - 验收：构建 `node scripts/build/index.js --prod --target h5,server --skip-quality` exit 0 → `npx playwright test --config=app/playwright.config.ts` 全绿。
- [ ] P5 全量回归 + 单 commit。验收：`npx vue-tsc --noEmit -p app/tsconfig.json`；`npx tsc --noEmit -p server/tsconfig.json`；`npx vitest run --config app/vitest.config.ts --dir app/test`；`npx vitest run --config server/vitest.config.ts --dir server/test`；`node scripts/quality_gate.js full`；`node scripts/build/index.js --prod --target h5 --skip-quality`（DONE + perf Δ≈0）；`npx playwright test --config=app/playwright.config.ts`——全 exit 0；pre-commit 真实跑通。message：`feat(answer): replace reading interpretation with single-quote Answer card`。

## 执行约束

类型检查用 [vue-tsc 不用 tsc](../CLAUDE.md)（前端）；vitest 必带 `--dir app/test`/`--dir server/test`。P1–P5 全绿才单 commit，禁中途 commit、禁跳步、禁门禁绕过。遇验收失败即停并报告。

## 进度

P1–P3 完成（服务端查表 + 数据真源、前端单面板、类型/文档/命名债登记，全量类型检查 / app+server 单测 / full 门禁 / prod perf Δ-0.0% 已绿）。P4 进行中：e2e 上轮遗留半迁移（仍锚已删 `.reading-panel`/分栏/抽屉），按新单面板契约修正中。P5 待 P4 通过后单 commit。

## 回滚

未提交：`git checkout -- <受影响文件>` 并 `rm` 未跟踪的 `AnswerInscription.vue`、`tarot_answer.json` 即回到 pivot 前 `feature` 头 `df4c3c8`。已提交：`git revert` P5 commit。

## 搁置问题

1. [`config/dependency-cruiser.cjs`](../config/dependency-cruiser.cjs) 的 `store-not-to-ui` 规则 from `^app/src/shared/store/`、to `^app/src/shared/(components|views)/` 指向真实结构中不存在的路径（store 实为 `core/store/`），为既有失效历史遗留规则，无对应映射，未臆改。恢复 store→UI 守卫语义需独立评估其目标路径，单列议题。

2. 「解读 → 答案」命名债：用户可见术语与全部 docs 已统一为「答案 / 答案卡 / 结果视图」，但请求生命周期管道为零 diff，内部标识保留未改：协议/状态标识 `reading`、`ReadingResult`、`readingResult`，路由响应字段 `reading`，`use_reading_request_controller`，store 的 `reading` slice，完成事件 `typewriterComplete`，e2e 沿用 `.reading-panel` 语义已被 `.answer-zone` 取代但控制器命名仍为 `reading`。待后续单独一步把上述内部标识统一重命名为 `answer*`，届时同步去除 docs 内「（内部标识仍为 reading，命名债）」括注。
