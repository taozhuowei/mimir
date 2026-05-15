# Scales Tarot — 迁移执行计划

> 目录结构见 [docs/app_structure.md](app_structure.md);架构约束与迁移必守规则(含 R9/R10/R11)见 [CLAUDE.md](../CLAUDE.md) "State-phase 迁移" 节。本文档只写计划。
>
> 顺序:**Phase A 架构迁移(h5)→ Phase B Bug(h5)→ Phase D 文档 → Phase C 小程序**。前一阶段 100% 完成才启动后一。
>
> 每个原子任务:一个 commit;commit 前过 `node scripts/quality_gate.js full` + 对应 `npx vitest run --config app/vitest.config.ts --dir app/test`;executor + 并行异构 audit agent;特殊验收在任务内注明。

---

## Phase A — 架构迁移(h5 only,保留视觉)

> 自下而上:**A0 core 重整 → A1 task → A2 phase → A3 state/controller → A4 view → A5 共享层 → A6 清理 → A7 验收**。

### A0. core 重整

- **A0.1** reconciler + utils → core:`animation/reconciler.ts` → `core/utils/reconcile.ts`(改动词名);`utils/{math,accessibility,secure_random,typing/,dev/,overlay_progress/}` → `core/utils/`;`utils/tarot_reading.ts` → `core/data/`;删旧 `animation/reconciler.ts` 与 `app/src/utils/`。executor `Frontend Developer`;审计 `Code Reviewer`+`Minimal Change Engineer`。commit `refactor: move reconciler and utils into core`
- **A0.2** api/ 拆分:`api/client.ts` → `core/http/client.ts`;`api/{cards,divinations}.ts` → `core/data/`;`api/types.ts` → `core/data/dto.ts`;`api/themes.ts` → `core/theme/themes.ts`;删 `app/src/api/`。executor `Backend Architect`;审计 `Code Reviewer`+`Minimal Change Engineer`。commit `refactor: split api into core/http, core/data, core/theme`
- **A0.3** layout_constants 拆分 → `core/constants/`:`typewriter_timing`(HERO_*)/ `animation_limits`(MAX_CARD_COUNT,MAX_CUT_PILES,AUTO_REVEAL_DELAY_MS)/ `drawer_geometry`(INITIAL_DRAWER_HEIGHT_RATIO,RESULT_LIFT_MARGIN_PX)/ `shuffle_motion`(SHUFFLE_SPREAD_X,SHUFFLE_EDGE_MARGIN)/ `interaction_safety`(DECK_CLICK_SAFETY_MS);删 `core/config/`。executor `Frontend Developer`;审计 `Code Reviewer`+`Minimal Change Engineer`。commit `refactor: split layout_constants into core/constants`
- **A0.4** `core/deck/types.ts` → `core/deck_geometry.ts`,删 `core/deck/`。commit `refactor: flatten core/deck/types into core/deck_geometry`
- **A0.5** 抽出 `useResponsiveScale`:`core/sizing/scale.ts` 内 composable(含 rAF shim + singleton)→ `app/src/composables/use_responsive_scale.ts`;`scale.ts` 只留纯 facade 再导出。executor `Frontend Developer`;审计 `Software Architect`+`Code Reviewer`。commit `refactor: extract useResponsiveScale into composables`
- **A0.6** `core/flow/types.ts`(旧 pipeline `PhaseContext`/`PhaseRunner`)标注:随 A3 控制器实现被新 ctx 类型取代,`core/flow/` 暂留,A3 后由 A6 删。不改代码,无 commit

### A1. task 层

> 拆各 phase builder 内 GSAP 段为独立 task async function。位置:仅一 phase 用 → 该 phase 目录(A2 收为局部 function);跨本 state 多 phase → `states/<state>/phases/shared/tasks/`;跨 state → `app/src/shared/tasks/`。本阶段只备 task,不建 flow。executor `Frontend Developer`;审计 `Code Reviewer`+`Minimal Change Engineer`。每任务删对应旧 builder.ts。

- **A1.1** shuffle:`hideInitialDeck`/`revealLeftStacks`/`revealRightStacks`/`showLeftRightVisibility`/`collectLeftStacks`/`collectRightStacks`/`hideLeftRightVisibility`/`revealInitialDeckBounce`。commit `refactor: extract shuffle phase tasks`
- **A1.2** cut:`initializePiles`/`spreadPiles`/`separatePileFirst`/`separatePileLast`/`realignPiles`/`hidePiles`。commit `refactor: extract cut phase tasks`
- **A1.3** draw(不修 stage.y bug,留 B1):`liftStage`/`liftStageCompletion`/`exitDeck`/`pullUp(ctx,i)`/`fall(ctx,i)`/`rebound(ctx,i)`/`settle(ctx,i)`/`alignCards`。commit `refactor: extract draw phase tasks`
- **A1.4** reveal(不合并 grow+flip,留 B2;删 atoms/grow.ts+flip.ts):`resetDrawsToEntry`/`growCards`/`flipCards`。commit `refactor: extract reveal phase tasks`
- **A1.5** fan(idle,task 暂置 `states/idle/phases/fan/`):`fanOut`/`holdFan`/`collectFan`/`holdCollected`(hold* 去留见 Q-F)。commit `refactor: extract fan phase tasks`
- **A1.6** reading enter:`composables/use_result_card_shrink.ts` + reading CSS @keyframes → 单 task `expandDrawer` + `calculateCardPosition`(Vue computed,非 task);删 use_result_card_shrink.ts。**依赖 Q-A 闭环**。commit `refactor: implement reading enter expand drawer task`
- **A1.7** reading typing:`ReadingTextContainer.vue` 打字机逻辑 → 单 task `typewriteText`(完成置 `reading.typingComplete=true`),ReadingTextContainer 改为只渲染进度。commit `refactor: extract reading typing task`

### A2. phase 层

> 每 phase 一目录 `states/<state>/phases/<phase>/{<phase>_flow.ts, components/}`,export 同名 async function,内部 await/Promise.all 调 task,**末尾必须 `ctx.phase_controller.next(ctx)`**;旧 pipeline 入口改调新 phase。executor `Frontend Developer`;审计 `Code Reviewer`+`Minimal Change Engineer`。

- **A2.1~A2.7** 逐个建 shuffle / cut / draw / reveal / fan / enter / typing 的 `<phase>_flow.ts`。draw 编排 `for i: await pullUp→fall→rebound→settle`;fan 无限 repeat 由 phase 内循环;enter/typing 单 task。每 phase 一 commit `feat: add <phase> phase flow`

### A3. state + controller 层

- **A3.1** `states/state_controller.ts` 全局单例:`current` ref/`next`/`jumpTo`/`cancel`/`run`;切 state 时 cancel 旧 + 调新 `state.run()`;cancel 细节见 Q-B(先 GSAP killTweensOf + AbortController 最简);建 `app/test/state_controller.test.ts`。executor `Software Architect`;审计 `Code Reviewer`+`Minimal Change Engineer`。commit `feat: add state_controller`
- **A3.2** 3 个 `states/<state>/phase_controller.ts`(idle/divination/reading 各一):接口 `currentPhase`/`next(ctx)`/`jumpTo(phaseName,ctx)`/`cancel()`/`run(ctx)`;`run` 返回 Promise(启动首 phase fire-and-forget,末尾 phase next 时 resolve + 调 `state_controller.next()`);三者逻辑同,可共享工厂(放 `app/src/shared/`,审计校验无跨 state 耦合);建 `app/test/phase_controller.test.ts`。executor `Software Architect`;审计 `Code Reviewer`+`Minimal Change Engineer`。验收:不直接 import 任何具体 state/phase。commit `feat: add per-state phase_controllers`
- **A3.3~A3.5** `states/<state>/<state>_flow.ts`:idle `phases:[fan]` / divination `[shuffle,cut,draw,reveal]` / reading `[enter,typing]`+`typingComplete` ref;run hook 创建本 state phase_controller 并调 run。每 state 一 commit `feat: add <state> state`
- **A3.6** 删 `stores/flow.ts`+`stores/reading.ts`(职责被接管)。前置 A4 完成。commit `refactor: remove obsolete flow and reading stores`

### A4. view 层

- **A4.1** 拆 `views/PlayView.vue` → `states/idle/view/IdleView.vue`(onclick 调 `state_controller.next()`)+ `states/divination/view/DivinationView.vue`;`pages/main/index.vue` 由 `state_controller.current` 决定挂载;删 PlayView。commit `refactor: split PlayView into IdleView and DivinationView`
- **A4.2** `Reading{Split,Drawer}View.vue` → `states/reading/view/`,删旧。commit `refactor: move reading views into reading state`
- **A4.3** main page 瘦身:只 mount state view + provide ctx;业务跳转改直调 `state_controller`;删 `composables/{use_app_phase,use_main_handlers,use_animation_controller,use_reading_controller}.ts`。commit `refactor: collapse main page into state view shell`

### A5. 共享层迁移(按 app_structure.md 归属)

> executor `Frontend Developer`(store/composables 用 `Software Architect`);审计 `Code Reviewer`+`Minimal Change Engineer`(A5.3 审计 `Software Architect`+`UX Architect`)。

- **A5.1** 跨 state 组件 `containers/{NotificationHost,Stage,HeaderArea}.vue` → `app/src/shared/components/`(L1)。commit `refactor: move cross-state components into shared`
- **A5.2** `containers/{TitleContent,ProgressContent}.vue` → `states/divination/view/containers/`。commit `refactor: move divination header components into divination view containers`
- **A5.3** `stage-content/*.vue`(Deck/DeckFanStack 等)→ `states/divination/shared/components/`(L2);idle 跨 state 引用作已知妥协(引用复杂则 executor 提议拆 IdleDeck/DivinationDeck,审计裁定)。验收:idle 扇形循环 + divination 全 phase 视觉无回归。commit `refactor: move deck components into divination shared`
- **A5.4** `containers/{ReadingPanel,ActionArea}.vue` → `states/reading/view/shared/components/`(L2.5,跨 drawer+split)。commit `refactor: move reading shared components into reading view shared`
- **A5.5** `containers/ReadingTextContainer.vue` → `states/reading/phases/typing/components/`(依赖 A2 typing 目录已建)。commit `refactor: move typewriter component into typing phase`
- **A5.6** `overlay/DevToolsPanel.vue` → `app/src/shared/components/`(L1,dev only),删空 `overlay/`。commit `refactor: move DevToolsPanel into shared`
- **A5.7** `stores/{notification,theme,tarot,deck}.ts` → `app/src/shared/store/`(L1)。executor `Software Architect`;审计 `Code Reviewer`+`Reality Checker`。commit `refactor: move shared stores into shared/store`
- **A5.8** `composables/use_*` 分层:工程类→`app/src/composables/`;跨 state(state 语义)→`app/src/shared/composables/`;单 state 跨 view+phase→`states/<state>/shared/composables/`;单 view→`states/<state>/view/composables/`;被新架构替代的旧 controller composable(`use_lifecycle`/`use_active_view`/`use_play_deck_animation` 等)→删。executor `Software Architect`;审计 `Code Reviewer`。commit `refactor: relocate composables to layered locations`

### A6. 清理

- **A6.1** `rg "app/src/(animation|api|utils|stores|views)|composables/commands|core/(flow|config)" app/src app/test/` 确认无引用,删所有空旧目录(含 `core/flow/`)。commit `chore: remove obsolete directories`

### A7. 验收(h5 only)

- **A7.1** `node scripts/quality_gate.js full` → `npx playwright test --config=app/playwright.config.ts`(仅 h5)→ 人工走查(待机/占卜/解读/重试/再占一次/回首页/窄屏/宽屏);暴露 bug 登记 Phase B。有修复 `fix:`,无则不提交

---

## Phase B — Bug 修复(h5,备忘)

- **B1** draw phase 末尾 `stage.y=0` 复位,reduced-motion 同步
- **B2** reveal 合并 `growCards`+`flipCards` 为单 `revealCards`(单 GSAP tween 同改 rotationY+scale,duration+ease 强制一致)
- **B3** Phase A 期间发现的其他 bug,逐项原子任务

## Phase D — 文档收口(备忘)

- **D1** `PRD.md` 拆 `docs/{product,architecture,commands,testing,deployment}.md`;架构正文从 git 历史整理进 `docs/architecture.md`;`README.md` 重写为入口索引
- **D2** 本 TODO 收敛为仅 Phase C 追踪 + 待决策

## Phase C — 小程序验证(备忘)

- **C1** mp-weixin 跑完整流程,生成 `docs/mp_diff_report.md`
- **C2** 按差异报告逐项修复(每项一原子任务)

---

## 待决策点

> 未闭环,相关任务暂留 TBD / 骨架。

- **Q-A reading 入场细节**。已锁:单 task `expandDrawer`(CSS class toggle 触发占卜视图 padding-bottom + 抽屉 transform);卡牌位置由 `calculateCardPosition()` 响应式函数自动驱动;舞台不变。待决:① `calculateCardPosition()` 放 `states/reading/shared/composables/`(跨 view+phase)还是 `states/reading/view/composables/`(仅 view)② 抽屉拖拉全屏本次还是未来 ③ layout solver 是否仅算占卜模式。
- **Q-B cancel 实现**。候选:A 每 task GSAP timeline,cancel 时 `gsap.killTweensOf`;B AbortController task 监听 signal;C 全局 cancellation_token task 主动 check。
- **Q-C dev replay 跳转**。已锁:仅 state+phase 级 jumpTo,不支持 task 级。待决:jumpTo 跳过的 state 是否执行 enter 副作用 —— A 完全不执行(目标 state 缺失现造)/ B 简化版 fastForward hook。
- **Q-D reading API 失败重试**(走 `core/data/divinations.ts`,无 service 层)。候选:A reading state `apiState` ref + 重试重调 divinations,不走 state_controller;B API 为等待 task,失败则 phase 失败捕获后重试。
- **Q-E cards-load error**。候选:A idle state store `error` ref + idle 内部 action 重试;B 独立 "error" phase。
- **Q-F idle hold* 空 task 去留**。候选:A 保留为 task;B 合并进 fanOut/collectFan(+delay);C phase 内直接 `await setTimeout`,不算 task。
- **Q-G fallback 是否第 4 state**。候选:A 第 4 state 走 state_controller;B 独立 page 路由(orbitPlanets 留内部)。**app_structure.md 按 B 假设**。
