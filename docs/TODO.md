# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

清偿四类已登记搁置债（pivot/N2 遗留）。按「先确定低风险（纯文档/注释）→ 纯重构（零行为）→ 需产品决策（停下问）」推进，每项独立单步、独立提交、每步全套验收。第五类（早期提交 commitlint footer 历史瑕疵）已权衡决定不动，不纳入。

## 禁止项（决策冻结）

1. F1–F4 不改运行时行为/协议/布局算法（纯注释/文档/测试描述，或纯结构重构保持表现逐字不变）；F5–F6 涉及改行为或产品取舍，须先停下报告并取得方向再动。
2. 每步独立单 commit，验收套件 = `vue-tsc(app)` + `tsc(server)` + `vitest(app)` + `vitest(server)` + `node scripts/quality_gate.js full` + `node scripts/build/index.js --prod --target h5,server --skip-quality`（DONE+perfΔ≈0） + `npx playwright test`（15/15，仅改运行时/结构步需跑；纯文档步以 full 门禁为准并说明）。
3. 禁 `--no-verify`/任何门禁绕过；前端类型检查用 vue-tsc；vitest 必带 `--dir`。遇产品决策点（F5/F6）即停，plain-text 给背景+选项+推荐，待定再续。

## 任务清单

- [x] F1 清 pivot「抽屉」措辞残留：实证 `test:266` 断言（answer_stage 比 draw_stage 小 + 中心上移）pivot 后仍成立、仅措辞过时——改测试名/注释为「为下方行内答案区让位」，断言逐字未变；`layout_solver_types.ts` `DrawerGeometry`/`cardWidth` 抽屉模型注释改述为现状（行内答案区预留，结构保留待 F6）。纯注释/测试名零运行时，full 门禁全绿，prod/e2e 与上次 `4f4bfdd` 同源运行时故省。
- [x] F2 中文「解读」逐条甄别——结论：零文件需改。`tarot_glossary.md:19`「不做牌义解读」属塔罗领域通用动作泛称（句意为本应用"不做解读"，改则语义失真，正确保留）；`routes/divinations.ts:9` `/api/v1/readings` 历史端点名陈述（C7 已判定允许残留，保留历史准确）；其余「解读」仅 `docs/TODO.md` 计划描述自身。核查类任务，实证后确认无需改动，不为做而做。
- [x] F3 [`DevToolsPanel.vue`](../app/src/flows/index/components/DevToolsPanel.vue) 职责拆分（纯重构，零行为）：拖拽 Vue 接线（anchor/dragging/containerStyle/pointer/click 抑制/生命周期）抽为 [`use_dev_panel_drag`](../app/src/flows/index/composables/use_dev_panel_drag.ts) composable，壳变薄；`emit('toggle-dev-expanded')` 留壳经 `consumeClick()`。`$emit` 透传据实证维持显式（Vue 标准、类型安全、对外契约零风险；强行收敛无净收益且风险高，不为重构而重构）。模板/样式/props/emits 逐字不变。全套验收 + e2e 15/15 通过。提交 `51bd81e`。
- [x] F4 [`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue) 职责拆分（纯重构，零行为）：idle 入场动画（DOM-free 状态 + GSAP 时间轴 + reduced-motion + mount/variant-flip/unmount 生命周期）抽为 [`use_title_entrance`](../app/src/flows/shared/composables/use_title_entrance.ts) composable，SFC 变薄只渲染文案。COPY 表 + v-if variant 分支据实证保留（已是薄形态，外置无净收益）。模板/样式/COPY/props 逐字不变，时序逐字移植。全套验收 + e2e 15/15 通过。
- [x] F5 `isWide` 双写竞态（方案 1：单一阈值 440，用户决策）：实证确认 bug 真实——同一 `isWide` ref 被 `recomputeIsWide`(>440) 与 `checkWidth`(≥920) 在 resize 时双写，440–920 区间非确定致切牌轴向不稳；常规手机/桌面落两阈值一致区，故此前测试未现。修复：`isWide` 仅 `recomputeIsWide(>MAX_CANVAS_WIDTH=440)` 单一写入；删 `checkWidth`/`PC_BREAKPOINT`/`WIDE_SIDE_DRAWER_WIDTH_PX` 全链（返回值零消费实证），`wide_breakpoint_and_chrome` 仅留 MP 胶囊；F5c：`stageContainerHeight` 恒等三元 + `showResults` 死参数化简（同 C2 删参数+调用方），`getViewportMetrics` 死字段注释为现状；顺修 C7 遗留语病。vue-tsc/tsc 双绿、`isWide` 单一写入复核通过；e2e 兜底按用户中断未单独跑（pre-commit 门禁真实跑）。`wide_breakpoint_and_chrome` 文件名已不贴切（仅余 MP chrome），改名待后续。
- [x] F6 `cardWidthFull/cardHeightFull` 合一评估——结论：**不可合一，零代码改动**。实证 `layout_solver_answer.solveAnswerStageLayout`：`cardWidth/Height`(shrunk)=减去 `answerStageReservation`（底部 40% 视口 + 操作区）后舞台拟合，`cardWidthFull/HeightFull`(full)=全安全区舞台拟合；手机画布(375–440)宽度两者都撞 240 上限，但**高度真实不同**（full 舞台更高）。二者承载结果卡 reveal 的「先长到 full、父再缩到 shrunk」两阶段动画（`pipeline_builder` 用 `cardWidthFull/HeightFull` 作 `resultCardWidth/Height`，活路径）。pivot 删的是抽屉**组件**，底部预留（行内答案区 + 操作区）仍在——双尺寸是活逻辑非死概念。此前「无抽屉→已无区分」系错误推断，实证推翻，纠正于此。仅历史措辞「drawer/抽屉」可后续中性化（与 layout_solver 注释/`INITIAL_DRAWER_HEIGHT_RATIO` 命名同属低优先文档/命名债）。

## 回滚

每步未提交：`git checkout -- .`（+ 还原任何 `git mv`）。已提交：对对应步 `git revert`（各步独立 commit，可分别回退）。

## 进度

四类搁置债转为 F1–F6 执行计划，全部完成。F1（抽屉措辞残留）`a2e82a7`；F2（中文「解读」甄别，零文件改）`8f985fd`；F3（DevToolsPanel 拖拽抽 composable）`51bd81e`；F4（TitleContent 入场动画抽 composable）`e22d750`；F5（isWide 双写竞态修复，方案 1）`f5ea876`；注释噪音清理 `657946e`；F6（cardWidthFull 合一评估，结论不可合一、零代码改）记于本提交。e2e：F3/F4 各自 e2e 15/15 通过；F5 当时因用户中断未单独跑，本轮收尾后已统一补跑 e2e 15/15 兜底 F3/F4/F5 累积运行时改动（占卜/切牌轴向/多视口）无回归，F5 唯一未验缺口闭合。

## 搁置问题（已登记，未排期）

1. 早期提交 `b5f7d9f` 的 commitlint `footer-leading-blank` ⚠：非阻塞历史小瑕疵，重写历史代价大于收益，已权衡决定不处理，仅此登记。
