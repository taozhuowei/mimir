# Scales Tarot — Architecture & Roadmap

> 项目架构契约文档。所有代码改动必须以本文档为准；后续任务拆解将基于此文档展开。

## 1. 背景与目标

### 1.1 当前痛点

- **概念层级混淆**：`view`（视图）、`flow`（流程）、`stage`（舞台）、`phase`（阶段）等术语彼此交叉、目录归属不一致
- **关注点未分离**：`app/src/views/PlayView.vue` 同时承担 idle 与 divination 两个 state（应用状态）的渲染
- **流程缺乏一等公民地位**：占卜流程的 phase 集中在 `app/src/animation/phases/`，但 reading（解读）流程没有独立模块；过渡逻辑（如抽屉滑入）散落在 CSS / composable / page 胶水代码三处
- **state 跳转分散**：`enterDecision()` / `resetToIdle()` 等被各组件 onclick 直接调用，没有统一入口，难追踪、难审计、难回放
- **平台兼容性风险**：mp-weixin（微信小程序）下 GSAP 无法直接 tween DOM ref，但当前抽屉 CSS @keyframes 与 stage / 卡牌 GSAP tween 的同步性靠手工保证

### 1.2 重构目标

1. 把 **state**（应用状态）提升为最高层级抽象 — 项目对外**只有 3 个 state**（待机 / 占卜 / 解读）
2. 每个 state 完全自治 — 自己拥有 view、containers、components、flow、stores、actions、events
3. **关注点分离**：view 层只渲染、flow 层只编排、store 层只持有状态、bus 层只协调跳转
4. **状态跳转穿过单一入口**（事件总线 = Pinia store action）— 全程可追踪、可日志化、可回放
5. **依赖方向单向**：`states → shared → core`，反向禁止
6. **底层动画选型按物理特性而非一致性**：reactive object（响应式对象）走 GSAP via reconciler、独立 DOM 视觉走 CSS @keyframes — 自然消解 mp-weixin 兼容性问题

## 2. 顶层目录架构

### 2.1 目录树（最终形态）

```
app/src/
│
├── states/                      # 三个自包含 state 模块
│   ├── idle/                    # 待机
│   ├── divination/              # 占卜
│   └── reading/                 # 解读
│
├── core/                        # 框架/底层
│   ├── bus/                     # 事件总线（transition / user_intent / lifecycle_log）
│   ├── store/                   # 全局共享状态（notification / theme / viewport / tarot）
│   ├── actions/                 # 全局 action 类型与契约
│   ├── events/                  # 全局事件类型与契约
│   ├── flow/                    # phase_runner 接口、atom 类型、orchestrator_base
│   └── animation/               # reconciler、animation_state、GSAP 适配
│
├── shared/                      # 共享代码逻辑
│   ├── composables/             # 跨 state hooks
│   ├── containers/              # 公共容器（Stage / HeaderArea / NotificationHost 等）
│   └── components/              # 公共组件
│
├── pages/                       # uni-app 路由约定（不可改名）
│
├── tools/                       # 工具
│
├── tests/                       # 测试
│
└── README.md                    # 唯一文档（PRD / 旧 TODO / docs 后续并入此处）
```

### 2.2 顶层边界规则

- **states/ 自治**：每个 state 含自己的 view / flow / store / actions / events，不跨界访问其他 state
- **core/ 是底层抽象**：不知道任何具体 state，提供框架级能力
- **shared/ 是可复用代码**：不知道任何具体 state，比 core 更靠近表现层
- **依赖方向**：`states → shared → core`，`states → core`（允许）；任何反向引用都是 bug
- **pages/ 仅作为路由壳**：挂载 `states/<current>/view/*View.vue` + `shared/containers/`，不持业务逻辑

## 3. 核心术语定义

### 3.1 state（应用状态）

应用层面的"当前正在做什么"。**全项目只有 3 个 state**：

- **idle（待机）**：app 启动 / 重置后的初始态
- **divination（占卜）**：用户提交问题后，到结果生成完成前的过程
- **reading（解读）**：结果展示与用户决策

`decision` 概念已废弃。原 `enterDecision()` 调用降级为 reading flow 内部的 phase 切换语义。

### 3.2 view（视图）

每个 state 拥有自己的 view 目录。view 是该 state 的"屏幕呈现入口"，可按设备 / 屏幕尺寸 / 上下文渲染多个变体（如 reading state 含 ReadingDrawerView 与 ReadingSplitView）。

### 3.3 container（容器）

view 内部的组合单元。容器可嵌套、可在多 view 间复用。

- **跨 state 共享的容器**（如 Stage / HeaderArea / NotificationHost）→ `shared/containers/`
- **state 专属的容器** → `states/<name>/view/containers/`

### 3.4 component（组件）

容器内的具体渲染单元。可以是静态（如标题文字）或动态（含内部状态机，如 TypewriterText）。组件**自管理内部状态**。

### 3.5 flow（流程）

每个 state 拥有自己的 flow 模块。flow 是该 state 内的时序编排，由 orchestrator（编排器）驱动 phase 序列推进。**flow 不强绑定 GSAP** — 内部实现可选 GSAP / CSS / Promise / 状态机。

### 3.6 phase（阶段）

flow 内部的时序段。每个 phase 含 builder（构造器）+ atoms/（原子集合）。phase 完成时通过 `notify*` action 上报到总线。

### 3.7 atom（原子）

phase 内部的最小动画/逻辑单元。每个 atom 只负责单一职责（如"舞台收窄"、"卡牌停泊"、"抽屉滑入"）。**atom 实现技术栈按物理特性选择**：

- 操作 reactive object（如 stage / draws）→ GSAP via reconciler
- 操作独立 DOM 视觉（如抽屉滑入）→ CSS @keyframes
- 操作异步事件（如 API ready）→ Promise
- 操作逐帧采样（如打字机进度）→ Vue reactivity / setInterval

### 3.8 orchestrator（编排器）

每个 flow 拥有一个 orchestrator，统一接口（实现 `core/flow/orchestrator_base.ts`），职责：

1. **入场**：从上一个 state 的退出协议接收 handover payload
2. **内部协调**：调度 phase 序列、监听 atom 完成、协调跨 phase 的状态同步
3. **完成检测**：判断本 flow 何时完成
4. **退场**：触发 `events/exit_handover.ts`，将控制权交给总线

### 3.9 store（状态）

Pinia store。每个 state 有自己的 store 目录，含本 state 内部的 reactive state。store 不直接被外部组件修改 — 所有修改通过 actions（本 state 内）或 bus（跨 state 时）。

### 3.10 actions（动作）

每个 state 的 `actions/` 目录暴露 `notify*` 系列函数，让 atom / phase / API 等系统层面发起的事件能上报到总线。actions 不能直接修改其他 state 的 store。

### 3.11 events（事件契约）

每个 state 的 `events/` 目录定义对外暴露的事件类型与退出协议（exit_handover）。events 是 state 模块的对外接口契约。

### 3.12 bus（事件总线）

`core/bus/` 是全局唯一总线，由三个 store 组成：

- **`transition.store.ts`** — 实际 state 跳转入口（`transition*` 系列 action，仅总线内部可调）
- **`user_intent.store.ts`** — 用户意图入口（`request*` 系列 action）
- **`lifecycle_log.store.ts`** — 全局跳转日志，用于追踪、审计、回放

## 4. 每个 state 模块的标准结构

```
states/<name>/
├── view/                        # 视图层
│   ├── <Name>View.vue           # 视图入口（多个时按屏幕/上下文择一）
│   ├── containers/              # 视图容器（嵌套）
│   └── components/              # 视图组件
│
├── flow/                        # 流程层
│   ├── orchestrator.ts          # 流程编排器（实现 core/flow/orchestrator_base）
│   └── phases/                  # 阶段集合
│       └── <phase-name>/
│           ├── builder.ts       # phase 构造器
│           └── atoms/           # 原子集合
│
├── store/                       # 状态层（Pinia）
│   └── *.store.ts
│
├── actions/                     # 内部 actions（notify*）
│   └── flow_actions.ts
│
├── events/                      # 对外契约（退出协议、事件类型）
│   └── exit_handover.ts
│
└── index.ts                     # 模块出口（仅暴露 view + 退出协议 + 必要类型）
```

## 5. 三个 state 的具体边界

### 5.1 idle（待机）

- **入场**：app 启动 / 用户从 reading 触发 backHome
- **职责**：展示主页、接受用户提问输入
- **退场**：用户提交问题 → 转 divination
- **flow 内部 phase**：可选（如有问候 / 进入动画）

### 5.2 divination（占卜）

- **入场**：从 idle 携带 question 进入
- **职责**：洗牌 → 切牌 → 抽牌 → 揭示
- **退场**：reveal phase 完成 + reading API 返回结果 → 转 reading
- **flow 内部 phases**：shuffle / cut / draw / reveal（4 个）
- **关键修复**：reveal phase 末尾 `stage.y` 不再 lifted；grow + flip atom 改为并发

### 5.3 reading（解读）

- **入场**：从 divination 携带 ReadingResult 进入
- **职责**：呈现解读、等待用户决策
- **退场**：用户点击 restart → 转 divination；用户点击 backHome → 转 idle
- **flow 内部 phases**：enter / typing（2 个）
  - **enter phase**：3 个并发 atom
    - `stage_dock`（舞台收窄，GSAP via reconciler）
    - `card_dock`（卡牌停泊，GSAP via reconciler）
    - `drawer_slide`（抽屉滑入，CSS @keyframes，按屏幕选 drawer 或 split 变体）
  - **typing phase**：1 个 atom — `typewriter`（打字机文本逐字呈现）
- **ActionArea 行为**：监听 typing 完成事件 → 自显现按钮；用户 onclick → emit 到 user_intent store
- **不存在 waiting phase**：等待用户操作的语义由"typing 完成 + ActionArea 自治组件 + 总线事件"协同表达

## 6. 事件总线与状态跳转规则

### 6.1 三层命名空间（强制约定）

所有动作的命名前缀必须落入以下三类之一：

**`request*`** — 用户意图（用户操作触发）

- 例：`requestRestart()` / `requestBackHome()` / `requestSubmitQuestion(text)`
- 位置：`core/bus/user_intent.store.ts`
- 职责：根据当前 state 决定转换为哪个 `transition*`

**`notify*`** — 系统通知（动画 / API / phase 完成触发）

- 例：`notifyPhaseComplete(phase)` / `notifyContentReady(result)` / `notifyTypingComplete()`
- 位置：`states/<name>/actions/flow_actions.ts`
- 职责：判断是否触发后续 `transition*` 或同 state 内的下一 phase

**`transition*`** — 实际状态跳转（仅总线内部可调）

- 例：`transitionToIdle()` / `transitionToDivination(question)` / `transitionToReading(result)`
- 位置：`core/bus/transition.store.ts`
- 职责：写入实际 state、记录 lifecycle_log、协调多 store

### 6.2 数据流（单向）

```
组件 onclick
   ↓ request*
[core/bus/user_intent.store]
   ↓ transition*
[core/bus/transition.store]
   ↓ 调用各 state 的 events/exit_handover

atom / phase / API 完成
   ↓ notify*
[states/<name>/actions/flow_actions]
   ↓ 触发条件满足时 → transition*
[core/bus/transition.store]
```

### 6.3 反模式禁止（违反即视为 bug）

- ❌ 组件 onclick 直接调 store action 改 state
- ❌ page 层持跳转胶水代码（如 `handleTypewriterComplete` → `enterDecision`）
- ❌ 组件直接 import 其他 state 的 store
- ❌ `transition*` 被 store/bus 之外的代码调用
- ❌ 在 atom / phase 内部直接修改 state.value
- ❌ flow orchestrator 直接修改其他 state 的 store

### 6.4 lifecycle_log 与可观测性

所有 `transition*` 调用必须经过 `lifecycle_log.store.ts` 记录：

- 时间戳
- 触发源（request* / notify*）
- 目标 state
- 携带的 payload 摘要

dev 模式下输出到 console；prod 模式下保留为内存环形缓冲，供 dev tools / 错误上报使用。

## 7. flow / phase / atom 实施规则

### 7.1 phase 接口去 GSAP 化

`core/flow/phase_runner.ts` 定义抽象接口：

```ts
interface PhaseHandle {
  cancel(): void               // 中断（GSAP 实现 = kill；CSS 实现 = removeEventListener；Promise 实现 = reject）
  promise: Promise<void>       // 完成信号
}

interface PhaseRunner {
  name: string
  run(context, onComplete): PhaseHandle
}
```

phase 实现者**自由选**底层技术栈。

### 7.2 atom 实现技术栈选择规则（强制）

按"操作对象的物理特性"选择：

- 操作 **reactive object**（如 `stage` / `draws[]` / `inners[]`）→ **GSAP via reconciler**
  - 理由：reconciler 已为 mp-weixin 验证过，能正确桥接到 transform 字符串
- 操作 **独立 DOM 视觉**（如抽屉根节点滑入）→ **CSS @keyframes**
  - 理由：mp-weixin 原生支持 CSS animation，无需 ref 注入；GSAP 直接 tween DOM ref 在 mp-weixin 上失败
- 操作 **异步事件**（如等待 API、等待用户输入）→ **Promise**
- 操作 **逐帧采样**（如打字机进度）→ Vue reactivity / setInterval

不同 atom 之间的"同步性"靠**同时长 + 同 cubic-bezier 缓动**近似实现，不追求"共享 timeline 时间锚点"的理想化。

### 7.3 mp-weixin 兼容性必须验证

任何新增 atom 必须在两个平台均验证：

- h5（HTML5 浏览器目标）
- mp-weixin（微信小程序目标）

若需平台分支，使用条件编译指令 `// #ifdef H5` / `// #ifdef MP-WEIXIN`，并写明分支理由。

## 8. 当前要修复的具体 bug

### 8.1 bug 现象

窄屏（viewport ≤ MAX_CANVAS_WIDTH，约 440px）下抽牌完成后，结果卡牌"先上移 → 再放大 → 再翻牌 → 再弹出抽屉"，时序错乱。

### 8.2 正确的目标流程

1. 抽牌阶段结束 → 卡牌位于屏幕几何中心、舞台 stage 不再 lifted、尺寸 = drawCardSize
2. 揭示阶段 → 在中心位置 grow（放大）与 flip（翻面）**并发**
3. 进入解读 state → enter phase 三个 atom 并发：
   - `stage_dock`：舞台 height 收窄到 reading_stage 几何
   - `card_dock`：卡牌 x/y/width/height 停泊到 reading_stage 终态
   - `drawer_slide`：抽屉/分栏滑入（CSS）
4. typing phase 启动 → 打字机文本逐字呈现
5. typing 完成 → ActionArea 自显现 → 等待用户操作

### 8.3 对应代码改动方向（仅作参考，不在本节拆解任务）

- `app/src/animation/phases/draw/builder.ts`：抽牌结束时复位 `stage.y → 0`
- `app/src/animation/phases/reveal/builder.ts`：grow + flip atom 改并发
- `app/src/composables/use_result_card_shrink.ts`：删除，职责合并到 reading flow 的 enter phase
- `app/src/views/ReadingDrawerView.vue`：CSS @keyframes 保留（不再纳入 GSAP timeline，由 enter phase 触发 v-show）

## 9. 渐进式整改路线（里程碑）

按依赖顺序、每步可独立验证、每步可独立回滚：

- **M1** — 锁定架构（本文档即为契约，无代码改动）
- **M2** — 建立顶层骨架：创建 `states/` / `core/` / `shared/` / `tools/` / `tests/` 空目录与 README 占位
- **M3** — 迁移 core 与 shared：reconciler、animation_state、共享容器等迁入对应位置
- **M4** — 建立 core/bus：实现三层命名空间总线（transition / user_intent / lifecycle_log）
- **M5** — 迁移 divination state：现有 animation/phases 迁入 `states/divination/flow/phases/`，含编排器
- **M6** — 修 divination 内部 bug：draw 末尾 stage 复位 + reveal grow/flip 并发
- **M7** — 建立 reading state：含 view / flow / orchestrator，迁移现有 reading 视图与逻辑
- **M8** — reading enter phase 落地：含 stage_dock / card_dock / drawer_slide 三 atom，删除 useResultCardShrink
- **M9** — 建立 idle state 与 page 瘦身：拆分 PlayView，迁移 idle 视图，page 层去胶水代码
- **M10** — 迁移其他全局 store / shared 内容：notification、theme、viewport、tarot
- **M11** — 文档迁移：PRD / docs / 本 TODO 内容并入 README.md
- **M12** — 测试体系完整化：每个 state 含单元 / 组件 / e2e 三层测试

## 10. 后续任务拆解约定

后续会话基于本文档拆解原子任务时，请遵守：

### 10.1 拆解原则

1. **每个原子任务必须可独立验证**（含明确的"完成判据"）
2. **每个原子任务必须可独立回滚**（不留半重构状态）
3. **任务粒度建议 ≤ 1 小时**（超出则继续拆分）
4. **每个任务标注**：所属 milestone（M1–M12）/ 受影响文件（含路径）/ 验证方式
5. **任务依赖关系显式化**（前置任务编号 + 并行可行性）
6. **风险任务标记**：涉及 mp-weixin 兼容性、PRD 变更、删除文件等高风险任务必须显式标记并配验证步骤

### 10.2 任务命名格式

- 格式：`M<里程碑编号>.<序号>` 例如 `M5.3`、`M8.12`
- 拆解后的任务列表追加在本文档之后（作为第 12 节及以后），不修改第 1–11 节的契约内容

### 10.3 任务追踪状态符号

- `[ ]` 待开始
- `[~]` 进行中
- `[>]` 待审计
- `[?]` 待验收
- `[x]` 已完成
- `[!]` 待确认

## 11. 不在本文档范围

- **任务拆解**：后续会话单独进行（见第 10 节）
- **代码实现**：所有具体代码改动留待 milestone 推进时进行
- **PRD 同步**：PRD 内容更新（特别是 §2 术语层级、§7 流程定义）将在 M11 文档迁移时统一处理
- **测试用例编写**：在每个 milestone 推进时同步进行，集中规划见 M12

---
