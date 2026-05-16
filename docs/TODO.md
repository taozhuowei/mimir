# 执行计划与进度跟踪

> 唯一执行跟踪文档。仅记录当前进行中的计划与进度，不留历史归档与未来设想。

## 目标

删除生产死代码 `app/src/state/use_overlay.ts`（`useOverlay` 在 `app/src` 零运行时调用），迁出其唯一存活导出常量，使测试对齐生产真实编排路径。

## 范围边界

本计划仅含 use_overlay 死代码删除批次。`flows/{idle,divination,reading}` 其余文件迁移与拆分报告中各未决项不在本计划，待逐项确认后另行追加登记。

## 调研结论

> S1 执行后回填，作为 S4 测试处置的分支依据。

- 待回填。

## 任务清单

- [ ] S1 判定死代码边界与测试覆盖性质
  - 操作对象：`app/src/state/use_overlay.ts`、`app/test/use_overlay.test.ts`、`app/test/overlay_sizing.test.ts`、`app/test/replay_from_phase.test.ts`、`app/test/_helpers/overlay_card.ts`、生产编排 `app/src/pages/main/index.vue` + `app/src/state/use_animation_controller.ts`
  - 操作步骤：复核 `useOverlay` 在 `app/src`（含 `#ifdef` 平台条件块）零运行时调用；判定两测试所测 `resultCardLiftY` / `cardsFocused` / `resultCardScale` 等派生在生产编排路径是否有等价实现；确认 `replay_from_phase.test.ts:82` 仅注释提及、`_helpers/overlay_card.ts` 是否仅服务这两测试
  - 影响范围：仅判定，无源码改动
  - 验收点：得出每个测试文件的处置结论（删除 / 重定向到生产实现 / 仅改注释保留）
  - 验收方式：`grep -rn` 全仓 + 阅读生产编排确认等价物有无；结论写入本文「调研结论」小节

- [ ] S2 迁出存活常量 `RESULT_LIFT_MARGIN_PX`
  - 操作对象：`app/src/state/use_overlay.ts:20`、新建 `app/src/flows/divination/composables/result_card_lift_margin.ts`、`app/src/components/Deck.vue:90,121`
  - 操作步骤：新建仅含 `RESULT_LIFT_MARGIN_PX` 的常量文件（附一行职责注释）；将 `Deck.vue` 的 import 改指向新文件
  - 影响范围：新增 1 文件；`Deck.vue` 1 处 import 路径变更，运行行为不变
  - 验收点：类型检查通过；`Deck.vue` 渲染与上浮计算不变；全仓再无指向 `state/use_overlay` 的常量 import
  - 验收方式：`npx vue-tsc --noEmit -p app/tsconfig.json`；`grep -rn "state/use_overlay" app/src` 仅余 `use_overlay.ts` 自身

- [ ] S3 删除 `use_overlay.ts`
  - 操作对象：`app/src/state/use_overlay.ts`
  - 操作步骤：删除该文件（移除 `useOverlay` / `UseOverlayDeps` / 内部全部 computed，均死代码）
  - 影响范围：`app/src` 不再存在该模块；不影响生产编排（`pages/main` 直接编排 `useAnimationController` + `useReadingController`）
  - 验收点：`app/src` 内对 `../state/use_overlay` 的 import 数为 0；类型检查通过
  - 验收方式：`grep -rn "state/use_overlay'" app/src` 无输出；`npx vue-tsc --noEmit -p app/tsconfig.json`

- [ ] S4 按 S1 结论处置测试
  - 操作对象：`app/test/use_overlay.test.ts`、`app/test/overlay_sizing.test.ts`、`app/test/_helpers/overlay_card.ts`、`app/test/replay_from_phase.test.ts:82`
  - 操作步骤：
    - 分支A（生产无等价实现，测的是死逻辑）：删除 `use_overlay.test.ts`、`overlay_sizing.test.ts`；`_helpers/overlay_card.ts` 仅服务这两测试则一并删，否则保留；更新 `replay_from_phase.test.ts:82` 注释移除 `use_overlay` 提及
    - 分支B（生产有等价实现）：将两测试重定向到生产编排路径（`pages/main` + `useAnimationController`）测同一派生，移除对 `useOverlay` 的 import
  - 影响范围：`app/test` 下 2-3 文件
  - 验收点：app 单测全绿，无跳过、无空断言；保留的测试覆盖真实生产逻辑，或已确认该逻辑随死代码消失
  - 验收方式：`npx vitest run --config app/vitest.config.ts --dir app/test`

- [ ] S5 全局回归
  - 操作对象：前端全量
  - 操作步骤：依次跑质量门禁、类型检查、app 单测、lint
  - 影响范围：全仓校验，不改源码
  - 验收点：四项全通过，无新增告警
  - 验收方式：`node scripts/quality_gate.js full`；`npx vue-tsc --noEmit -p app/tsconfig.json`；`npx vitest run --config app/vitest.config.ts --dir app/test`；`npx eslint app/src/ app/test/`

## 回滚

任一步验收失败即停并报告，不绕过门禁；改动未提交，`git checkout -- <file>` 与删除新建文件即可复原。

## 进度

未开始。
