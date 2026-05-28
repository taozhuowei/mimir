# 术语表

## 视图层抽象（abstraction layers）

1. 视图（view）：逻辑页面，由状态驱动切换，承载一种完整交互场景。
2. 容器（container）：视图内部的位置盒子，负责定位与容纳，不关心内容细节。
3. 内容（content）：容器内部的具体物，分为文字与动画两类。

## 路由（route）

1. 主路由（main route）：应用唯一 uni-app 路由，作为启动外壳，按引导资源加载结果在主面板与加载视图之间二选一，二者互斥；加载失败时加载视图常驻不变，错误经顶部通知告知。
2. 主面板（main surface）：引导成功时由主路由呈现的业务面，内部按状态切换待机视图 / 占卜视图 / 结果视图。

## 视图（view）

1. 待机视图（idle view）：主面板初始状态，用摊牌动画引导用户触发占卜。
2. 占卜视图（divination view）：触发占卜后呈现，舞台依次播放洗牌 / 切牌 / 抽牌 / 翻牌动画。
3. 结果视图（result view）：进入答案 flow 后呈现，结果卡牌在占卜舞台定格并上移留白，正下方行内答案区呈现答案，答案区与操作区同帧挂载、动效同步；不分栏、不侧栏、不抽屉，全宽统一。
4. 加载视图（loading view）：引导资源加载期间与加载失败时由主路由呈现、与主面板互斥的唯一视图，用加载提示文案与几何动画提示等待；失败时该视图常驻，由顶部通知（notification）独立告知错误明细，不打断用户。

## 容器（container）

1. 标题区（title area）：承载主标题、副标题、引导文字；加载视图的标题区写加载提示文案。
2. 流程进度区（progress area）：占卜视图顶部，展示流程阶段进度图标。
3. 舞台（stage）：专门用来播放动画的容器，待机视图、占卜视图、加载视图各自持有一个舞台实例。
4. 答案卡（answer card / AnswerCard）：占卜视图结果卡牌正下方的行内区域，本身即唯一可见容器（无外包装），min-height 由 `--answer-zone-min-height` 兜底、底部贴齐、内部可滚；自持加载 / 错误 / 成功三态，承载一句名句的原文、翻译与来源；同时充当布局求解器的 stage 下方预留（`sizes.answerZoneMinHeight`）。
5. 操作区（action area）：仅在答案 flow 出现，与答案卡同帧挂载，承载再占一次 / 重试 / 回到首页等操作按钮。占卜 flow、待机 flow、加载视图均无操作区。
6. 通知（notification）：跨视图的全局浮层容器，应用运行时所有异常通过它在顶部显示，明显但不突兀，不阻塞操作；同时承担启动失败的错误告知（加载视图常驻不变）。

## 内容 — 动画（animation）

动画的分帧规范见 [animation.md](animation.md)，视图过渡动画见 [animation.md](animation.md)。

1. 卡牌动画（card animation）：作用主体是卡牌或牌堆，包含摊牌动画、洗牌动画、切牌动画、抽牌动画、翻牌动画。
2. 几何动画（geometry animation）：作用主体是几何图形，当前包含加载动画——以恒星与四颗 3D 立体行星组成的循环天体动画，加载与启动失败常驻态共用。
3. 文字动画（text animation）：作用主体是文字，当前包含答案卡入场动画——答案卡内原文 / 翻译 / 来源分段 rise-in 浮现，无逐字打字机。
4. 视图过渡动画（view transition animation）：视图切换时的过渡动画。

## 流程状态（flow） 与 动画相位（phase）

DDD 区分：
1. flow：应用级流程状态，3 个值 `idle / divination / answer`。`answer` 是终态，答案区与操作区同帧挂载。store 字段 `tarotStore.flow`，类型 `Flow`，see `app/src/core/store/slices/flow.ts`。
2. phase：占卜（divination flow）内部的动画相位，4 个值 `shuffling / cutting / drawing / revealing`，对应进度区图标。类型 `OverlayPhase`，see `app/src/flows/base/composables/animations/phase_contracts.ts`。

完整状态机、出口、异常恢复见 [state.md](state.md)。

## UI 操作（UI action）

1. 触发占卜（trigger divination）：点击待机视图舞台进入 divination flow。
2. 再占一次（restart）：answer flow 中按下，回到 divination flow 重新经历所有动画。
3. 重试（retry）：占卜请求失败时重发请求，仍在 answer flow，不重新经历仪式动画。
4. 回到首页（back home）：清空状态返回 idle flow。

## 数据术语（data term）

1. 卡牌（card）：单张塔罗牌。
2. 牌堆（deck）：未发出的多张卡牌的集合。
3. 分牌堆（pile）：切牌过程中分出的小堆。
4. 结果卡牌（result card）：本次占卜最终抽到的卡牌；占卜完成后在占卜舞台定格并上移，下方为答案区。
5. 答案（answer）：一次占卜的产物，按抽到的卡牌及其正逆位返回的一句名句，含原文 quote、翻译 translation、来源 source 三个字段。
6. 牌阵类型（spread kind）：本期仅支持单张（single card）。
7. 物理视口（viewport）：屏幕物理像素信息——宽、高、安全区、状态栏。
8. UI 预算（reservations）：各区域的像素预留——标题区、操作区、答案卡、卡牌间距等。`answerZoneMinHeight` 是答案卡的像素预算（最坏情况），layout solver 据此扣减 stage 可用高，使卡牌 reveal 终态尺寸不溢出 stage；答案卡内容罕见地超出 min-height 时，flex 在运行时进一步压 stage，求解器仍保持保守。
9. 布局求解（solve layout）：纯函数布局求解器，从视口与预算算出所有容器和卡牌的几何位置。
