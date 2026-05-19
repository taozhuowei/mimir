# 术语表

## 视图层抽象（abstraction layers）

1. 视图（view）：逻辑页面，由状态驱动切换，承载一种完整交互场景。
2. 容器（container）：视图内部的位置盒子，负责定位与容纳，不关心内容细节。
3. 内容（content）：容器内部的具体物，分为文字与动画两类。

## 路由（route）

1. 主路由（main route）：应用唯一 uni-app 路由，作为启动外壳，按引导资源加载结果在主面板与兜底视图之间二选一，二者互斥。
2. 主面板（main surface）：引导成功或加载中时由主路由呈现的业务面，内部按状态切换待机视图 / 占卜视图 / 结果分栏视图 / 结果抽屉视图。

## 视图（view）

1. 待机视图（idle view）：主面板初始状态，用摊牌动画引导用户触发占卜。
2. 占卜视图（divination view）：触发占卜后呈现，舞台依次播放洗牌 / 切牌 / 抽牌 / 翻牌动画。
3. 结果分栏视图（reading split view，内部组件标识仍为 ReadingSplitView，命名债）：宽屏专用，从屏幕右外侧滑入到右半屏，与占卜视图左右分栏。
4. 结果抽屉视图（reading drawer view，内部组件标识仍为 ReadingDrawerView，命名债）：窄屏专用，从底部向上弹出，高度上限不超过结果卡牌底部，可手动拖动调整。
5. 兜底视图（fallback view）：引导资源不可用时由主路由呈现、与主面板互斥的唯一视图，用神秘文案与几何动画提示无法连接。

> 结果分栏视图与结果抽屉视图统称为“结果视图”，二者依据视口断点二选一呈现。后文提及“结果视图”时，按当前屏宽自动指代其中一个。

## 容器（container）

1. 标题区（title area）：承载主标题、副标题、引导文字；兜底视图的标题区写神秘提示文案。
2. 流程进度区（progress area）：占卜视图顶部，展示流程阶段进度图标。
3. 舞台（stage）：专门用来播放动画的容器，待机视图、占卜视图、兜底视图各自持有一个舞台实例。
4. 答案面板（reading panel，内部组件标识仍为 ReadingPanel，命名债）：结果分栏视图与结果抽屉视图共享的内容父容器，尺寸自适应；其 success 槽位内含单一答案卡。
5. 答案卡（AnswerCard）：答案面板内唯一内容子容器，呈现一句名句的原文、翻译与来源。
6. 操作区（action area）：仅在决策阶段出现，承载再占一次 / 重试 / 回到首页等操作按钮。答案阶段（答案卡入场中）、占卜阶段、翻牌相位、待机阶段、兜底视图均无操作区。
7. 通知（notification）：跨视图的全局浮层容器，应用运行时所有异常通过它在顶部显示，明显但不突兀，不阻塞操作。

## 内容 — 动画（animation）

动画的分帧规范见 [animation.md](animation.md)，视图过渡动画见 [animation.md](animation.md)。

1. 卡牌动画（card animation）：作用主体是卡牌或牌堆，包含摊牌动画、洗牌动画、切牌动画、抽牌动画、翻牌动画。
2. 几何动画（geometry animation）：作用主体是几何图形，当前包含兜底动画——以恒星与四颗 3D 立体行星组成的循环天体动画。
3. 文字动画（text animation）：作用主体是文字，当前包含答案卡入场动画——答案卡内原文 / 翻译 / 来源分段 rise-in 浮现，无逐字打字机。
4. 视图过渡动画（view transition animation）：视图切换时的过渡动画。

## 流程阶段（process stage）

应用级 4 阶段（idle / divination / reading / decision）、占卜内 4 相位（shuffling / cutting / drawing / revealing）、决策阶段出口（restart / back home / retry）的完整定义见 [state.md](state.md)。

## UI 操作（UI action）

1. 触发占卜（trigger divination）：点击待机视图舞台进入占卜。
2. 抽屉拖动（drawer drag）：拖动结果抽屉调整高度，不越过结果卡牌底部。
3. 再占一次（restart）：决策阶段后重新开始一次完整占卜，重新经历所有动画。
4. 重试（retry）：占卜请求失败时重发请求，不重新经历仪式动画。
5. 回到首页（back home）：清空状态返回待机视图。

## 数据术语（data term）

1. 卡牌（card）：单张塔罗牌。
2. 牌堆（deck）：未发出的多张卡牌的集合。
3. 分牌堆（pile）：切牌过程中分出的小堆。
4. 结果卡牌（result card）：本次占卜最终抽到的卡牌；占卜完成后留在占卜舞台展示，结果抽屉的高度上限以此为锚。
5. 答案（answer，路由响应字段与内部状态标识仍为 reading / readingResult，命名债）：一次占卜的产物，按抽到的卡牌及其正逆位返回的一句名句，含原文 quote、翻译 translation、来源 source 三个字段。
6. 牌阵类型（spread kind）：本期仅支持单张（single card）。
7. 物理视口（viewport）：屏幕物理像素信息——宽、高、安全区、状态栏。
8. UI 预算（reservations）：各区域的像素预留——标题区、操作区、卡牌间距等。
9. 布局求解（solve layout）：纯函数布局求解器，从视口与预算算出所有容器和卡牌的几何位置。
10. 抽屉几何（drawer geometry）：结果抽屉尺寸——初始高度、最大高度、宽度、对齐方向。
11. 答案区域（reading zone，内部标识仍为 reading zone，命名债）：答案面板在屏幕上的物理空间。

## 塔罗领域术语

塔罗领域术语（卡牌名、正位 / 逆位含义、四元素象征、宫廷牌等）单独维护于 [../tarot_glossary.md](../tarot_glossary.md)，由本文件单向引用，词表不反向引用本项目术语。
