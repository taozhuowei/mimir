# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。每个任务为独立单步：读「本任务描述 + 其超链接引用的文档与代码」即可获得全部上下文，知道怎么做、怎么测。

## 当前状态

无进行中计划。最近完成「解读 → 答案」命名债清偿 N2（S1 数据契约+协议字段、C1 文档/注释、C2 删宽屏分栏死布局分支、C3 请求管道/控制器/store/事件改名、C4 `reading_stage`→`answer_stage`、C5 文件/目录 git mv + import/配置/README、C6 应用阶段标识、C7 docs 去括注 + 全仓 reading 残留收口），各步独立提交、每步全套验收（vue-tsc/tsc + app/server vitest + full 门禁 + prod 构建 + e2e 15/15）通过。代码内已无 `reading*` 命名债标识，仅余允许残留：CSS `.reading-panel`（e2e 禁复活负向断言）、英文通用动词 `reading`（读取语义）、`/api/v1/readings` 历史端点名陈述。

下一项工作开始时，重写本文件「目标 / 范围 / 任务清单 / 进度 / 回滚」各节为该计划内容。

## 搁置问题（已登记，未排期）

1. 组件职责拆分债：
   a. [`TitleContent.vue`](../app/src/flows/shared/components/TitleContent.vue)：`variant: idle|fallback` 一组件三职责（文案表 + 自管 GSAP 错落入场 + 视图语义分支）。应拆为纯文案渲染 + 入场动画驱动 + 按 variant 薄包装。
   b. [`DevToolsPanel.vue`](../app/src/flows/index/components/DevToolsPanel.vue)：可拖拽折叠壳 + 10+ 纯 `$emit` 透传 + 拖拽/点击手势消歧混合。透传收敛、拖拽抽 composable、壳只管布局可见性。
2. `cardWidthFull/cardHeightFull` 双卡尺寸语义债：pivot 删抽屉后「抽屉挂载前/后」双尺寸已无实际区分（`cardWidthFull` 仍被 `pipeline_builder` 当 `resultCardWidth` 用）。是否与 `cardWidth` 合一属布局逻辑简化，单列。同源 pivot「抽屉」措辞残留：[`layout_solver.test.ts`](../app/test/layout_solver.test.ts) 第 266 行测试名「lifts above the bottom drawer」、`SceneLayout.cardWidth`/`stageShiftY`/`DrawerGeometry` 等注释仍按抽屉模型描述（抽屉已删，应改述为「为下方行内答案区让位」）；属文档/注释债。
3. pivot 布局逻辑残留债（C2 实证发现，均属动逻辑/产品判断）：
   a. `isWide` 双写阈值矛盾：[`use_main_stage.ts`](../app/src/flows/index/composables/use_main_stage.ts) `recomputeIsWide` 用 `> MAX_CANVAS_WIDTH`(440)、[`wide_breakpoint_and_chrome.ts`](../app/src/core/sizing/overlay_layout/wide_breakpoint_and_chrome.ts) `checkWidth` 用 `>= PC_BREAKPOINT`(920)，写同一 `isWide` ref，阈值不一致。需产品判断 `isWide`（现仅驱动切牌轴向）采哪个阈值并去重。
   b. `WIDE_SIDE_DRAWER_WIDTH_PX` 误导命名：已与 UI 解耦、仅作 `isWide` 断点 480 加数，名仍含 `DRAWER`。改名牵动 `PC_BREAKPOINT` 可读性，单列。
   c. `viewport_scene_layout.getViewportMetrics` 的 `stageContainerHeight = showResults ? stageHeight : viewport.height` 两支恒等、`stageWidth` 字段全仓 0 读取：疑可连同 `showResults` 参数进一步简化，属布局逻辑简化，单列。
4. pivot/N2 中文文档措辞统一债：[`docs/tarot_glossary.md`](tarot_glossary.md) 等仍有「解读」中文措辞，需逐条判定属塔罗领域通用术语（保留）还是指本应用流程产物（应统一为「答案」）；[`docs/prd/glossary.md`](prd/glossary.md) 18/19/29 行的视图模型曾按 pivot 前分栏/抽屉描述（已于 C1 重写，确认无残留）；`server/src/routes/divinations.ts` 历史端点名 `/api/v1/readings` 陈述（保留历史准确或淡化，单列）。
