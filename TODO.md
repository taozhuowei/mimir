# Scales Tarot — TODO

## 状态符号

- `[ ]` 待开始
- `[~]` 进行中
- `[>]` 待审计
- `[?]` 待验收
- `[x]` 已完成
- `[!]` 待确认

---

## 阶段 8 — 门禁残留 + 架构债 + 容器统一

### 8.1 门禁扫描已发现但未处理的问题

#### 8.1.A — quality-scan FunctionSize 警告（3 项）

`[ ]` **8.1.A.1** `app/src/animation/phases/reveal/builder.ts:32` `buildRevealPhaseRunner` 87 行（cap 80）→ 提取子函数

`[ ]` **8.1.A.2** `app/src/animation/phases/reveal/builder.ts:35` `run` 82 行 → 同上

`[ ]` **8.1.A.3** `app/src/core/sizing/scale.ts:378` `useResponsiveScale` 95 行 → 同上

#### 8.1.B — quality-scan EslintDisable reason 格式不规范（4 项）

`[ ]` **8.1.B.1** `server/src/app.ts:73` 的 `-- dev-only loopback` 改 `-- reason: dev-only loopback`

`[ ]` **8.1.B.2** `app/src/pages/main/index.vue:352` 加 reason

`[ ]` **8.1.B.3** `app/src/pages/main/index.vue:355` 加 reason

`[ ]` **8.1.B.4** `app/src/pages/main/index.vue:358` 加 reason

> 备注：8.1.B.2-4 的 `document.documentElement.classList` 调用应整体重构（`#ifdef H5` 包裹或抽到独立 H5-only 模块），见 8.3.3

#### 8.1.C — quality-scan FileSize 警告（5 项）

`[ ]` **8.1.C.1** `app/src/components/stage-content/IdleDeck.vue` 346 行 — 按职责拆分子文件

`[ ]` **8.1.C.2** `app/src/composables/use_overlay_layout.ts` 361 行 — 按职责拆分子文件

`[ ]` **8.1.C.3** `app/src/core/sizing/layout_solver.ts` 345 行 — 按职责拆分子文件

`[ ]` **8.1.C.4** `app/src/core/sizing/scale.ts` 473 行（超 173）— 按职责拆分子文件

`[ ]` **8.1.C.5** `app/src/pages/main/index.vue` 443 行（超 143）— 按职责拆分子文件

#### 8.1.D — knip unused exports（6 项 真死代码）

`[ ]` **8.1.D.1** `app/src/api/themes.ts:73` `fetchThemes` 函数 — grep 二次确认零调用方后删除

`[ ]` **8.1.D.2** `app/src/core/config/layout_constants.ts:18` `WIDE_BREAKPOINT` 常量 — 同上

`[ ]` **8.1.D.3** `app/src/utils/accessibility.ts:32` `trapFocus` 函数 — 同上

`[ ]` **8.1.D.4** `server/src/services/theme_loader.ts:259` `getDefaultTheme` 函数 — 同上

`[ ]` **8.1.D.5** `server/src/services/theme_loader.ts:313` `clearThemeCache` 函数 — 同上

`[ ]` **8.1.D.6** `server/src/services/theme_loader.ts:322` `getCachedTheme` 函数 — 同上

#### 8.1.E — knip 配置 hints（5 项）

`[ ]` **8.1.E.1** `knip.json` ignore 中 `app/vite.config.ts` 冗余 — 移除

`[ ]` **8.1.E.2** `knip.json` ignore 中 `src/env.d.ts` 冗余 — 移除

`[ ]` **8.1.E.3** `knip.json` ignore 中 `src/shime-uni.d.ts` 冗余 — 移除

`[ ]` **8.1.E.4** `knip.json` server entry `src/server.ts` 冗余 — 移除

`[ ]` **8.1.E.5** `knip.json` app entry `src/main.ts` 冗余 — 移除

#### 8.1.F — sonarjs 5 条规则降为 warn（待 ratchet 升 error）

`[x]` **8.1.F.1** `sonarjs/void-use` 升 error（当前 0 命中，可立即升）

`[x]` **8.1.F.2** `sonarjs/no-small-switch` 升 error（当前 0 命中）

`[x]` **8.1.F.3** `sonarjs/no-nested-conditional` 升 error（当前 0 命中）

`[x]` **8.1.F.4** `sonarjs/no-all-duplicated-branches` 升 error（当前 0 命中）

`[x]` **8.1.F.5** `sonarjs/slow-regex` 升 error（当前 0 命中）

> 备注：deadline 待用户拍板（见 8.4.2）

#### 8.1.G — sonarjs/todo-tag 整条永久关闭（1 项）

`[ ]` **8.1.G.1** 评估是否真的应该永久 mute（当前 ESLint 也用 `no-warning-comments` 覆盖，是否双关 redundant？）

#### 8.1.H — depcruise 4 条规则维持 warn 而非 error（4 项）

`[ ]` **8.1.H.1** `no-orphans` severity warn → 评估是否升 error

`[ ]` **8.1.H.2** `no-circular` severity warn → 评估升 error

`[ ]` **8.1.H.3** `no-deprecated-core` severity warn → 评估升 error

`[ ]` **8.1.H.4** `not-to-deprecated` severity warn → 评估升 error

#### 8.1.I — 配置宽容化的代价（4 项）

`[ ]` **8.1.I.1** jscpd 阈值 1.5% 是否够严 — 评估并调整

`[ ]` **8.1.I.2** knip `ignoreExportsUsedInFile: true` — 跨文件单次引用就算"用了"是否过宽，评估收紧

`[ ]` **8.1.I.3** depcruise `tsPreCompilationDeps: true` — 删某个 import-type 引用就突然变孤儿，需要监控

`[ ]` **8.1.I.4** knip `vite: false` — knip 不知道 vite 配置里的 entry/plugins，可能漏检；评估打开

#### 8.1.J — 浏览器层门禁盲区（1 项 真盲点）

`[ ]` **8.1.J.1** 接入 Playwright smoke 测试到 `quality_gate.full`：启动 SPA → 看控制台 console.error / 网络请求 4xx 5xx / CSP 违规。CSP 错误这次靠人工抓到——这是该自动化的。

#### 8.1.K — eslint-disable 直接 ignore（5 处，3 处可重构）

`[ ]` **8.1.K.1** `server/src/app.ts:71-77` `sonarjs/no-clear-text-protocols` — **永久保留**（dev loopback 边界清晰），仅确认 reason 合规（与 8.1.B.1 关联）

`[ ]` **8.1.K.2** `pages/main/index.vue:352` `no-restricted-globals, no-undef` — 重构 toggleContainerBorders：用 `// #ifdef H5` 包裹整个函数 OR 抽到独立 H5-only 模块，完成后删除 disable（与 8.1.B.2 / 8.3.3 关联）

`[ ]` **8.1.K.3** `pages/main/index.vue:355` 同 8.1.K.2

`[ ]` **8.1.K.4** `pages/main/index.vue:358` 同 8.1.K.2

`[ ]` **8.1.K.5** 8.1.K.2-4 的 reason 格式见 8.1.B.2-4，统一处理

### 8.2 架构债

`[ ]` **8.2.1 phase replay 架构修复 — 裂缝 1：phase 顺序在 3 处定义**
- `animation/phases/registry.ts` PHASE_STEPS 数组
- `animation/pipeline.ts:70` `getDefaultPhaseOrder()` 死代码
- `composables/commands/pipeline_builder.ts:buildPhaseRunners` 隐式顺序
- 做什么：升级 registry 为单一 manifest（含 buildRunner），消除其他两处

`[ ]` **8.2.2 phase replay 架构修复 — 裂缝 2：phase 不自带"入场状态快照"**
- 每个 PhaseRunner 加 `snapToEntryState(animState, layout)` 方法
- replayFromPhase 改为：reset → 前置阶段全部 snap → 跑目标阶段
- skipToReading 用同一机制简化
- 做什么：建议先 8.2.1 后 8.2.2，但二者强耦合可一起做

`[ ]` **8.2.3 IdleDeck `_scene.scale 1→1.5` scale 滥用**
- 文件：`app/src/components/stage-content/IdleDeck.vue`
- 做什么：审视该处 scale 跳变是否符合"用计算尺寸不用 scale"原则；考虑改为容器尺寸过渡或保留并 document 例外

`[!]` **8.2.4 去 UniApp 化决议** — **用户决定：先不做**（保留 mp-weixin 编译目标）
- 影响面：删 `<view>` 改 `<div>`、删 `// #ifdef` 条件编译、删 `uni.X` API 全换 web 标准、删 reconciler 胶水层、估计删 20-30% 代码
- 后续如需重启此项，需重新评估 mp-weixin 是否仍是发布目标

`[ ]` **8.2.5 mp-weixin 菜单按钮避让 TODO**
- 位置：`app/src/pages/main/index.vue` cssVarStyle 注释里挂着
- 做什么：H5 主线不阻塞，仅当决定继续支持 mp-weixin 才需要做（与 8.2.4 联动）

### 8.3 容器统一 + 视觉对齐

`[ ]` **8.3.1 HeaderArea 容器统一**
- 新建 `app/src/components/containers/HeaderArea.vue` 作为壳子层（高度/padding/对齐/overflow）
- 把 TitleArea / ProgressArea 拆成壳子（HeaderArea） + 内容（TitleContent / ProgressContent）
- IdleView / DivinationView 改为 `<HeaderArea><TitleContent /></HeaderArea>` 形式
- 做什么：物理保证 idle ↔ divination 切换时容器位置不跳

`[x]` **8.3.2 标题 + 进度图标整体下移** — `TitleArea.vue` + `ProgressArea.vue` 各加 `margin-top: 32px`，覆盖 mp-weixin menu button (~87px 顶部高度) 与当前 header 起点（safe-area-top + var(--margin) ≈ 63px）的 24px 差，留 8px 呼吸

`[ ]` **8.3.3 devtool 容器边框 H5-only 重构**
- 见 8.1.K.2-4：把 `toggleContainerBorders` 用 `// #ifdef H5` 包裹或抽出
- 做什么：完成后 `pages/main/index.vue` 三处 eslint-disable 自然消失

### 8.4 用户拍板才能动的事

`[!]` **8.4.1 GitHub 分支保护**（即原 TODO 7.2.6）
- 推荐配置：`main` 分支 Required status checks `verify` job、禁止 force push、禁止删除、PR 至少 1 名审阅者批准
- 仓库管理员需在 GitHub Settings → Branches 启用

`[x]` **8.4.2 sonarjs ratchet 升 error 的 deadline** — 用户决定方案 A：5 条立即升 error。已在 `eslint.config.mjs` 落实，gate 通过。

---

## 阶段间约束

1. 8.1 / 8.2 / 8.3 大致并行执行；8.4 是阻塞项，需用户拍板才能推进相关条目
2. 每个子任务独立 commit，可独立回退
3. 任意子任务遇到边界冲突立即停下问用户，禁止擅自决策
4. 8.1.B / 8.1.K / 8.3.3 三组互相关联，建议一次重构 `toggleContainerBorders` 一并解决
5. 8.2.1 与 8.2.2 强耦合，建议捆绑处理
