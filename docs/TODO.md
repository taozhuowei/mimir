# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 目标

清偿四类已登记搁置债（pivot/N2 遗留）。按「先确定低风险（纯文档/注释）→ 纯重构（零行为）→ 需产品决策（停下问）」推进，每项独立单步、独立提交、每步全套验收。第五类（早期提交 commitlint footer 历史瑕疵）已权衡决定不动，不纳入。

## 禁止项（决策冻结）

1. F1–F4 不改运行时行为/协议/布局算法（纯注释/文档/测试描述，或纯结构重构保持表现逐字不变）；F5–F6 涉及改行为或产品取舍，须先停下报告并取得方向再动。
2. 每步独立单 commit，验收套件 = `vue-tsc(app)` + `tsc(server)` + `vitest(app)` + `vitest(server)` + `node scripts/quality_gate.js full` + `node scripts/build/index.js --prod --target h5,server --skip-quality`（DONE+perfΔ≈0） + `npx playwright test`（15/15，仅改运行时/结构步需跑；纯文档步以 full 门禁为准并说明）。
3. 禁 `--no-verify`/任何门禁绕过；前端类型检查用 vue-tsc；vitest 必带 `--dir`。遇产品决策点（F5/F6）即停，plain-text 给背景+选项+推荐，待定再续。

## 任务清单

- [ ] F1 清 pivot「抽屉」措辞残留（纯文档/注释/测试名，零运行时）：实证 [`layout_solver.test.ts`](../app/test/layout_solver.test.ts) 第 266 行测试断言性质——仅描述措辞过时则改其名与描述为「为下方行内答案区让位」语义；若断言逻辑本身假设抽屉存在则转 F6 评估。同步 [`layout_solver_types.ts`](../app/src/core/sizing/layout_solver_types.ts) `SceneLayout.cardWidth`/`stageShiftY`/`DrawerGeometry` 等仍按抽屉模型的注释为现状（行内答案区，无抽屉），不改字段/逻辑。验收：full 门禁 + 因纯注释/描述零运行时，prod/e2e 与上次同源可省并说明（断言若调整则补 e2e）。
- [ ] F2 中文「解读」文档措辞统一（逐条甄别）：扫 [`docs/`](.) 与 [`README.md`](../README.md)、[`app/src/README.md`](../app/src/README.md) 全部「解读」，逐条判定——指本应用占卜产物者改「答案」；属塔罗领域通用术语（如正逆位含义解释、占卜动作泛称）者保留。`server/src/routes/divinations.ts` 历史端点名 `/api/v1/readings` 改为中性历史表述或保留并明确标注。验收：full 门禁；文档链接不破。
- [ ] F3 [`DevToolsPanel.vue`](../app/src/flows/index/components/DevToolsPanel.vue) 职责拆分（纯重构，零行为）：把 10+ 纯 `$emit` 透传收敛（`v-bind/v-on` 转发或下沉）、拖拽/点击手势消歧抽为独立 composable、壳只管布局与可见性；模板渲染与对外事件契约逐字不变。验收：全套 + e2e 15/15（DevTools 在 e2e 路径，必跑）。
- [ ] F4 [`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue) 职责拆分（纯重构，零行为）：拆为纯文案渲染 + 入场动画驱动 + 按 `variant` 的薄包装；idle/fallback 两形态视觉与时序逐字不变。验收：全套 + e2e 15/15（待机/兜底视图在 e2e 路径）。
- [ ] F5 `isWide` 布局逻辑债（**需产品决策，开工即停下问**）：双写阈值矛盾（440 vs 920，定哪个并去重）、`WIDE_SIDE_DRAWER_WIDTH_PX` 误导命名、`stageContainerHeight` 恒等三元 + `stageWidth` 字段 0 读取简化。先实证三处真实影响面，plain-text 提交决策（阈值取舍）后再改；改后全套 + e2e。
- [ ] F6 `cardWidthFull/cardHeightFull` 双卡尺寸合一（**需评估，可能停下问**）：实证 `cardWidthFull` 与 `cardWidth` 在无抽屉后是否值恒等、`pipeline_builder` 用 `resultCardWidth` 的实际取值；若实证可等价合一则纯化简（全套 + e2e 证零行为变更），若存在真实差异或需产品判断则停下报告。

## 回滚

每步未提交：`git checkout -- .`（+ 还原任何 `git mv`）。已提交：对对应步 `git revert`（各步独立 commit，可分别回退）。

## 进度

四类搁置债转为 F1–F6 执行计划，未启动。F1（最低风险，纯文档/注释）起。

## 搁置问题（已登记，未排期）

1. 早期提交 `b5f7d9f` 的 commitlint `footer-leading-blank` ⚠：非阻塞历史小瑕疵，重写历史代价大于收益，已权衡决定不处理，仅此登记。
