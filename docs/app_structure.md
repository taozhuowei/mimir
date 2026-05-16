# 目录架构

> 目录架构权威文档。CLAUDE.md 为导航,冲突以本文件为准。
> 按目录层级分章,每章只展开本层,不重复整棵树。
> `app/src/` 为状态机迁移中的**目标结构**;迁移计划见 [TODO.md](TODO.md),架构总则见 [CLAUDE.md](../CLAUDE.md) "State-phase 迁移" 节。

---

## 根目录 `scales-tarot/`

npm workspaces 根;本层只列顶层目录与根文件。

```
scales-tarot/
├── app/                  # uni-app + Vue 3 前端(h5 + mp-weixin 双产物)
├── server/               # Express 4 + zod 后端(:4124)
├── scripts/              # 构建编排 + 质量门禁(不暴露为 npm script)
├── config/               # 根级工具配置
├── docs/                 # 权威文档
├── .github/              # CI / 依赖 / PR 模板
├── dist/                 # 构建产物(gitignored)
├── CLAUDE.md             # Claude Code 导航文件
├── README.md             # 命令 / env / 部署 / git 流程
├── package.json          # npm workspaces 根(仅暴露 install/dev/prod 3 个脚本)
└── package-lock.json
```

---

## `app/` — uni-app + Vue 3 前端

h5 + mp-weixin 双产物;本层只展开 `app/` 直属。

```
app/
├── src/                  # 源码(目标结构,迁移中)
├── test/                 # 前端测试(vitest 单元/组件 + playwright e2e)
│   └── e2e/              # playwright 端到端用例
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json
├── shims-uni.d.ts
└── package.json
```

### `app/src/` 子树(目标结构,迁移中)

迁移完成前旧结构与目标结构部分共存;以下为**目标**结构。

composables 归属规则(用户定):工程类(零 store、无 state 业务语义)→ `core/composables/`;与单一具体 state 强相关 → `states/<state>/composables/`;跨 ≥2 个 state 的粘合/命令 → `states/shared/composables/`。每个落点后注明依据。
本轮新建 `states/{idle,divination,reading}` 三个 state 目录及 `states/shared/`;`use_overlay_controller.ts`(`use_overlay` 的向后兼容 re-export shim)按 [CLAUDE.md](../CLAUDE.md) R9 零兼容**删除**,不重定位。
store → `core/store/`;跨 state 的 components/tasks → `states/shared/`(用户决定)。顶层 `shared/` 与 `composables/` 均消除,`app/src/` 顶层只剩 `core` / `states`(+ `pages`/`styles`/根文件)。
⚠ 此映射为**过渡落点、非终态**:粘合/命令类(`use_app_phase`、`use_active_view`、`use_overlay`、`use_main_handlers`、`use_lifecycle`、`commands/*` 等)实际重构时须从**全局项目视角**拆解为状态机真实函数(`state_controller` / `*_flow` / phase / task),**不得**作为单体 composable 原样搬运(用户指示)。

```
app/src/
│
├── core/                                  # 框架底层 + IO 基础设施 + 逻辑域(工程类,与 state 无关)
│   ├── utils/                             # 工程类纯函数
│   │   ├── reconcile.ts                   # GSAP ↔ Vue ref 桥接
│   │   ├── math.ts
│   │   ├── accessibility.ts
│   │   ├── secure_random.ts
│   │   ├── typing/
│   │   ├── dev/
│   │   └── overlay_progress/
│   ├── http/
│   │   └── client.ts                      # uni.request 封装(h5/mp 兼容底层请求)
│   ├── data/                              # 卡牌数据 + 解读领域
│   │   ├── cards.ts
│   │   ├── divinations.ts
│   │   ├── tarot_reading.ts
│   │   └── dto.ts
│   ├── store/                             # 跨 state Pinia store(原 shared/store,用户决定移入 core)
│   │   ├── deck.ts
│   │   ├── notification.ts
│   │   ├── tarot.ts
│   │   ├── theme.ts
│   │   ├── flow.ts                        # Phase A2 计划删除(state_controller 替代)
│   │   └── reading.ts                     # Phase A2 计划删除(core/data + reading state 替代)
│   ├── theme/
│   │   └── themes.ts
│   ├── deck_geometry.ts                   # 牌堆几何坐标类型
│   ├── constants/                         # 调优常量,按职责分文件
│   │   ├── typewriter_timing.ts
│   │   ├── animation_limits.ts
│   │   ├── drawer_geometry.ts
│   │   ├── shuffle_motion.ts
│   │   └── interaction_safety.ts
│   ├── sizing/                            # 布局求解
│   │   ├── responsive_breakpoints.ts
│   │   ├── responsive_sizes.ts
│   │   ├── scale.ts                       # useResponsiveScale 定义在此(响应式尺寸,非 composable)
│   │   ├── solve_from_window.ts
│   │   ├── layout_solver.ts
│   │   ├── layout_solver_types.ts
│   │   └── layout_solver_computers.ts
│   └── composables/                       # 工程类 composable(零 store / 无 state 业务语义);原顶层 composables/ 收编
│       ├── use_animation_state.ts         # GSAP 目标 / 可见性 / 样式协调
│       ├── use_playback.ts                # 时间轴播放控制
│       ├── use_phases.ts                  # OverlayPhase 四阶段生命周期(无 DivinationPhase)
│       ├── use_presentation.ts            # 进度头 / 页脚纯派生
│       ├── use_css_var_bridge.ts          # 尺寸 → CSS 变量桥接
│       ├── use_overlay_layout.ts          # 视口 / 场景 / 动作指标外观
│       ├── pipeline_shared_deps.ts        # 管道 DI 契约(纯类型)
│       ├── use_lifecycle_types.ts         # 生命周期类型
│       ├── overlay_layout/                # 纯布局 / 运动几何
│       │   ├── breakpoints.ts
│       │   ├── scene.ts
│       │   └── motion.ts
│       ├── commands/                      # 无 store 的管道构建 / 运行
│       │   ├── pipeline_builder.ts
│       │   └── start.ts
│       └── play/                          # 无 state 语义的 play 基础设施
│           ├── types.ts
│           └── fan_controller.ts          # 12 卡扇形 GSAP 循环
│
├── states/                                # 三个 state 模块 + 全局 state 控制 + 跨 state 共享
│   ├── state_controller.ts                # 全局 state 控制器(管 state 间跳转)
│   │
│   ├── shared/                            # 所有 state 共享:跨 state 组件 / 粘合 / 命令 / task
│   │   ├── components/                    # NotificationHost / Stage / HeaderArea / DevToolsPanel(原顶层 shared/components)
│   │   ├── composables/
│   │   │   ├── use_overlay.ts             # divination+reading 合并外观
│   │   │   ├── use_main_handlers.ts       # divination→reading page 级编排
│   │   │   ├── use_dev_tools.ts           # 跨 state dev 命令面板
│   │   │   ├── use_play_deck_animation.ts # 跨 idle+divination 牌组动画(扇循环+占卜 rig)
│   │   │   ├── use_app_phase.ts           # 过渡置此;实际重构拆解为 state_controller 真实跳转函数(非原样搬运)
│   │   │   ├── use_active_view.ts         # 过渡置此;实际重构拆解为 state_controller/view 真实选择函数(非原样搬运)
│   │   │   └── commands/
│   │   │       └── replay_from_phase.ts   # 任意 phase 回放(跨 divination→reading)
│   │   └── tasks/                         # 跨 state 共享 task(原顶层 shared/tasks)
│   │
│   ├── idle/                              # state 1: 待机(1 view / 1 phase)
│   │   ├── idle_flow.ts                   # state 流程入口
│   │   ├── phase_controller.ts            # 本 state 的 phase 控制器
│   │   ├── composables/
│   │   │   └── play/click_handler.ts      # idle 点击 + 双击锁(gate phase==='idle')
│   │   ├── shared/                        # L2 跨 view+phase 共享 { components/ composables/ tasks/ }
│   │   ├── view/                          # { IdleView.vue containers/ components/ composables/ }
│   │   └── phases/
│   │       └── fan/                       # { fan_flow.ts components/ }
│   │
│   ├── divination/                        # state 2: 占卜(1 view / 4 phase)
│   │   ├── divination_flow.ts
│   │   ├── phase_controller.ts
│   │   ├── composables/
│   │   │   ├── use_animation_controller.ts # 占卜动画编排(组合 core/composables 基础设施)
│   │   │   ├── use_lifecycle.ts            # 占卜生命周期(entry/reset/interrupt/pipeline)
│   │   │   └── play/divination_rig.ts      # 占卜 GSAP rig 启停
│   │   ├── shared/                        # L2 跨 view+phase: Deck / DeckFanStack
│   │   ├── view/                          # { DivinationView.vue containers/(TitleContent/ProgressContent) components/ composables/ }
│   │   └── phases/                        # shared/(L3) + shuffle/ cut/ draw/ reveal/(各 *_flow.ts + components/)
│   │
│   └── reading/                           # state 3: 解读(2 view / 2 phase)
│       ├── reading_flow.ts
│       ├── phase_controller.ts
│       ├── composables/
│       │   ├── use_reading_controller.ts        # 解读生命周期(start/retry/reset)
│       │   ├── use_reading_panel_controller.ts  # 解读面板视图模型
│       │   ├── use_result_card_shrink.ts        # 进解读时卡牌 shrink
│       │   └── commands/skip_to_reading.ts      # 跳过洗/切/抽直达 revealing
│       ├── shared/                        # L2 跨 view+phase 共享
│       ├── view/                          # { ReadingDrawerView.vue ReadingSplitView.vue shared/(L2.5: ReadingPanel/ActionArea) containers/ components/ composables/ }
│       └── phases/                        # shared/(L3) + enter/ typing/(各 *_flow.ts + components/)
│
├── pages/                                 # uni-app 路由(不可改名)
│   ├── main/                              # 主路由 → state_controller 接管
│   └── fallback/                          # FallbackView + orbitPlanets 动画
│
├── styles/                                # 全局样式
├── App.vue                                # uni-app 根组件
├── main.ts                                # 入口(createSSRApp + Pinia)
├── pages.json                             # uni-app 路由表
├── manifest.json                          # uni-app 应用配置
├── env.d.ts                               # 环境类型声明
├── shime-uni.d.ts                         # uni-app 类型补丁
├── uni.scss                               # uni-app 全局 scss 变量
└── config.json                            # 应用配置
```

---

## `server/` — Express 4 + zod 后端(:4124)

```
server/
├── src/
│   ├── app.ts            # 中间件链(security→CORS→logger→/static→/api→SPA→error)
│   ├── server.ts         # 端口转发 / 优雅关停(SIGTERM/SIGINT)
│   ├── config.ts         # 环境配置(isProd 等)
│   ├── logger.ts         # 请求日志
│   ├── routes/           # cards / divinations / themes
│   ├── services/         # card_loader / theme_loader / tarot_reading
│   ├── data/             # 78 张塔罗牌 JSON(major/cups/pentacles/swords/wands)
│   └── utils/            # secure_random
├── public/
│   └── static/themes/    # 主题静态资源(golden_dawn …)
├── test/                 # vitest + supertest(api / backend / middleware)
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## `scripts/` — 构建编排 + 质量门禁

不暴露为 npm script。

```
scripts/
├── build/                # index.js 唯一构建入口 + dev.js / prod.js
├── lib/                  # port_kill.js
├── quality_gate.js       # full | staged 代码门禁
├── quality_scan.js       # 门禁扫描实现
├── quality_baseline.json # 质量基线
├── perf_baseline_gate.js # 性能基线门禁
├── perf_baseline.json    # 性能基线
├── pr_size_gate.js       # PR 体积门禁
├── gitleaks_run.js       # 密钥扫描
└── dev_env.js            # 写 .env.development.local(注入 LAN IP)
```

---

## `config/` — 根级工具配置

```
config/
├── eslint.config.mjs
├── dependency-cruiser.cjs
├── jscpd.json
├── knip.json
├── commitlint.config.cjs
└── gitleaks.toml
```

---

## `docs/` — 权威文档

```
docs/
├── README.md             # docs 文档索引
├── PRD.md                # 产品总述(大图景 + prd/ 入口)
├── prd/                  # 产品需求模块文档
│   ├── product.md        # 目标 / 用户 / 范围 / 视觉方向 / 非功能 / 验收
│   ├── state.md          # 状态机:流程阶段 / 相位 / 用户流程 / 异常恢复
│   ├── view.md           # 视图与视觉层 / 视图功能需求 / 交互原则
│   ├── animation.md      # 动画分帧 / 视图过渡 / 动效规范
│   └── glossary.md       # 项目权威术语表(view/container/phase)
├── TODO.md               # 执行计划 / 阶段跟踪
├── app_structure.md      # 本文档(目录架构权威)
└── tarot_glossary.md     # 塔罗领域术语
```

---

## `.github/` — CI / 依赖 / PR 模板

```
.github/
├── workflows/
│   └── ci.yml            # CI: verify(quality_gate full)+ e2e(build + playwright)
├── dependabot.yml
└── pull_request_template.md
```
