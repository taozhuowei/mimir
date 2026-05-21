# 状态机

## 流程状态与动画相位

DDD 区分：flow 是应用级流程状态、phase 是 divination flow 内的动画相位，二者解耦。

### 应用级流程（flow，3 个状态）

1. 待机（idle）：用户尚未触发占卜，待机视图展示。
2. 占卜（divination）：用户已触发，占卜视图依次播放洗牌、切牌、抽牌、翻牌仪式动画。
3. 答案（answer）：终态。占卜视图结果卡定格并上移，正下方行内答案区分段 rise-in 入场呈现名句的原文 / 翻译 / 来源；操作区与答案区同帧挂载、动效同步出现。

类型 `Flow` 定义于 `app/src/core/store/slices/flow.ts`。store 字段 `tarotStore.flow`，转移函数 `startDivination` / `enterAnswer` / `setFlow` / `reset`。

### 占卜内动画相位（phase，4 个）

仅在 divination flow 内部生效，对应占卜视图流程进度区的 4 个图标：

1. 洗牌相位（shuffling）：占卜舞台播放洗牌动画。
2. 切牌相位（cutting）：占卜舞台播放切牌动画。
3. 抽牌相位（drawing）：占卜舞台播放抽牌动画。
4. 翻牌相位（revealing）：占卜舞台播放翻牌动画，结果卡牌定格。

类型 `OverlayPhase` 定义于 `app/src/flows/base/composables/animations/phase_contracts.ts`。

### 答案 flow 的出口

- 再占一次（restart）→ 回到 divination flow（重新经历仪式动画）
- 回到首页（back home）→ 回到 idle flow
- 重试（retry）→ 异常态下重发占卜请求，仍处于 answer flow

---

## 视图与 flow 的对应

1. idle → 待机视图
2. divination → 占卜视图，含全部洗牌 / 切牌 / 抽牌 / 翻牌仪式动画
3. answer → 结果视图（占卜视图结果卡下方行内答案区，全宽统一，无分栏 / 抽屉）；答案卡 rise-in 入场，操作区同帧挂载

占卜视图流程进度区的 4 个图标在 divination flow 内逐个高亮，对应洗牌、切牌、抽牌、翻牌四个 phase，与 flow 不一一对应。

---

## 用户流程

1. 用户进入主路由，停留在待机视图（flow=idle），看到摊牌动画循环播放。
2. 用户点击待机视图舞台，触发占卜（flow 切到 divination）。
3. 系统切换到占卜视图，按固定流程展示仪式动画：
   - 洗牌动画（phase=shuffling）
   - 切牌动画（phase=cutting）
   - 抽牌动画（phase=drawing）
   - 翻牌动画（phase=revealing）
4. 翻牌完成，结果卡牌定格在占卜舞台中央。
5. 系统进入 answer flow（终态）：结果卡上移、其正下方行内答案区与操作区同帧挂载，分别播放 rise-in 与同步淡入。
6. 用户可选择：
   - 阅读完整答案内容
   - 在异常时通过重试恢复
   - 通过再占一次回到 divination flow 重新经历仪式动画

---

## 占卜流程要求

- 占卜流程应自动推进，不要求用户在中途多次点击确认
- 仪式动画应传递仪式感，但不能明显拖慢用户完成结果的速度
- 在减弱动态效果场景下，流程仍应可完成

---

## 异常与恢复

- 当读取卡牌资源失败时，待机视图必须给出重试路径，或进入兜底视图
- 当占卜请求失败时，必须通过通知给出清晰错误提示
- 重试时直接重新发起一次完整占卜（后端在单一事务内重抽 + 重取名句），用户不需要重新经历仪式动画，但抽到的牌会换一组——这与“抽牌 + 答案”已合并为一个服务端步骤的协议一致
- 非阻塞问题不能导致整页白屏或卡死
