# TODO — Scales Tarot

> 更新日期：2026-04-21
> 当前交付范围：H5 + `single_card`
> 执行顺序：质量门禁 -> 问题修复 -> 回归验收

## 规则与状态

| 标记 | 含义 |
|---|---|
| `[ ]` | 待开始 |
| `[~]` | 进行中 |
| `[?]` | 待验收 |
| `[x]` | 已完成 |
| `[!]` | 阻塞 / 待确认 |

- 状态严格流转：`[ ] -> [~] -> [?] -> [x]`；任一阶段如被阻塞，立即转为 `[!]` 并写明原因。
- 开始即更新：任务一旦开工，立即改为 `[~]`，禁止事后补标。
- 完成即闭环：只有存在可复核证据时才能标记 `[x]`，证据必须是命令输出、构建结果、测试结果或人工验证记录。
- 单一事实源：当前执行状态只以本文件为准；已完成事项不保留在主清单中。
- 新增固定数值必须集中到常量或配置；禁止把魔法数字散回业务代码。

## 已确认的门禁缺口与异常

- [x] 安全门禁阈值已明确：`npm audit --omit=dev --audit-level=high` 为阻断门禁；13 个 esbuild moderate 漏洞已评估并接受进入白名单，复查日期 2026-05-21。详见 `docs/AUDIT_WAIVER.md`。
- [!] 产品口径与实现不一致：`PRD.md` 仍声明支持 `single_card`、`three_card`、`cross_spread`，但 `app/src/stores/tarot.ts` 仍将 `spreadKind` 固定为 `single_card`，对应测试也在固化该行为。（**移至 G1.1 处理**）
- [!] 发布配置与主线不一致：`app/src/manifest.json` 仍硬编码 `mp-weixin.appid`，并保留相机权限；与当前 H5 主线不对齐。（**移至 G1.3 处理**）
- [!] 可访问性逻辑未真正接线：`DivinationOverlay.vue` 中已有 `overlayRef` / `handleOverlayKeydown` / `trapFocus`，但模板未绑定根节点 `ref` 与对应键盘事件。（**移至 G1.2 处理**）

## G0 质量门禁补齐

### [x] G0.1 统一本地与 CI 质量命令入口

- 目标：把 `type-check`、`lint`、`test`、`build:h5`、`build:server`、`audit`、`arch:check` 收敛为一套统一命令，避免本地、hook、CI 三套口径。
- 处理：新增统一质量运行时；本地与 CI 使用 `npm run quality` 全量模式，hook 使用 `npm run quality:staged` 快速模式，但两者必须共用同一个运行时实现；README、技术文档、CI、hook 同步引用这套入口体系。
- 验收点：`npm run quality` 已串起 `lint -> type-check -> test -> build:h5 -> audit -> arch:check`；`npm run quality:staged` 与其共用同一运行时实现；CI 只调用 `npm run quality`；pre-commit 已安装并调用 `npm run quality:staged`；统一入口返回非 0 时，必须来自真实门禁失败而不是入口缺失。
- 验收策略：执行 `npm run quality`、`npm run quality:staged`；检查 `.github/workflows/ci.yml`、`.simple-git-hooks.json` 与 `.git/hooks/*` 的实际接线；复核 README 和技术文档是否同步。

### [x] G0.2 修正 lint 覆盖范围与配置边界

- 目标：让前端、后端、测试代码的 lint 策略明确且可执行，消除"脚本声称覆盖，配置实际忽略"的假门禁。
- 处理：决定是扩展现有 ESLint 到 `server/src`，还是拆分前后端配置；同步修正 `lint` 脚本与 pre-commit。
- 验收点：`lint` 覆盖范围与配置一致；执行结果可解释；不会再出现 `server/src` 被声称检查但实际未检查。
- 验收策略：运行 `npm run lint`，并单独验证 hook 调用路径与 CI 路径一致。

### [x] G0.3 建立可用的架构门禁

- 目标：让依赖结构检查从“不可用误报”变成“可执行门禁”。
- 处理：新增 `npm run arch:check`；修正 `.dependency-cruiser.js` 对 workspace、test、类型依赖和允许例外的规则；明确哪些 warning 允许保留、哪些 error 必须阻断。
- 验收点：`arch:check` 使用仓库本地依赖可稳定执行；结果以真实结构问题为主，不再被 workspace 误报淹没。
- 验收策略：运行 `./node_modules/.bin/depcruise ...` 对比修复前后输出；保留例外说明和规则注释。

### [x] G0.4 收紧测试告警门禁

- 目标：测试通过不再等于“带 warning 的假绿”。
- 处理：为 uni-app 组件测试补齐 `scroll-view` 等运行环境处理；阻断未处理的 Vue warn / console error 静默通过。
- 验收点：组件测试通过且无未处理 warning；`DivinationOverlay` 相关测试结果干净。
- 验收策略：运行 `npm test`，检查 `divination_overlay_a6.test.ts` 与相关组件测试输出为无 warning 通过。

### [x] G0.5 明确安全与构建告警策略

- 目标：把安全漏洞和构建告警从“知道有问题”变成“有结论、有处理路径”。
- 处理：
  - `npm audit` 阻断门禁保持 `--audit-level=high`（仅阻断 high/critical）
  - 13 个 esbuild moderate 漏洞（GHSA-67mh-4wv8-2f99）经风险评估后接受进入白名单：`docs/AUDIT_WAIVER.md`
  - 风险分析：仅影响开发服务器，生产构建无暴露面；上游 `@dcloudio` 无修复版本，强制 fix 为 breaking change
  - 复查日期：2026-05-21
  - 新增 `npm run quality:audit:info`（`--audit-level=moderate`）供信息查看，不阻断 CI
  - H5 构建无字体告警，无需额外处置
- 验收点：安全风险和构建告警都有明确门禁标准；没有默认忽略项。
- 验收策略：运行 `npm audit --omit=dev` 与 `npm run build:h5`，将当前输出和处置结论写回文档 / 配置。
- 验收证据：`docs/AUDIT_WAIVER.md` 已建立；`npm run quality:audit` 通过；`npm run quality:audit:info` 可查看 moderate 详情。

## 审查发现的新问题（待规划阶段）

> 来源：G0 阶段代码整体审查（2026-04-21）
> 原则：P0 必须进入当前阶段；P1/P2 可进 G2 或后续阶段，由规划方确认。

### P0 — 必须立即处理

- [ ] **后端错误处理中间件失效**：`server/src/app.ts` 错误处理器签名缺少 `next` 参数（arity=3），Express 将其识别为普通中间件而非错误处理器，导致未捕获异常跳过自定义日志和分类逻辑。
- [ ] **主题加载目录遍历**：`server/src/services/theme_loader.ts` 直接将 URL 参数拼接到文件路径，存在 Path Traversal 风险。
- [ ] **`spreadSlots` 危险类型断言**：`app/src/composables/use_overlay_controller.ts:310` 用 `[] as unknown as CardLayout[]` 伪装空数组，运行时可能静默失败。
- [ ] **Controller 测试形同虚设**：`use_overlay_controller.test.ts` / `overlay_controller_sizing.test.ts` 只断言属性存在，不验证任何真实行为。
- [ ] **组件测试验证不存在的 props**：`divination_overlay_a6.test.ts` 传入 `isWide` / `cardCount` props，但组件并不声明这些 props。
- [ ] **焦点管理零测试覆盖**：`divination_overlay_a6.test.ts` 对 Tab 循环、焦点恢复等完全无测试。

### P1 — 重要

- [ ] **cardId 不存在返回 500**：`routes/readings.ts` 将卡牌不存在视为内部错误返回 500，违反 HTTP 语义且泄露内部信息。
- [ ] **`prefersReducedMotion()` 重复定义**：`utils/accessibility.ts` 与 `utils/typing/typewriter_model.ts` 各有一份实现，后者 import 了但未使用。
- [ ] **`clamp()` 重复定义**：`core/layout/card_position_calculator.ts` / `scene_layout.ts` / `utils/overlay_layout/motion_metrics.ts` 三处独立定义。
- [ ] **魔法数字散落**：`RESULT_LIFT_MARGIN_PX`、`spreadX: 120`、`shuffleEdgeMargin`、`DECK_CLICK_SAFETY_MS` 等未集中管理。
- [ ] **`drawCardsAndFetchReading` 遗留死代码**：`stores/tarot.ts` 中标记为 Legacy 的方法已无生产调用。
- [ ] **`destroyed` 标志只写不读**：`reading_orchestrator.ts` 中该标志未生效，竞态/销毁守卫不完整。
- [ ] **GSAP 类型强转 ×8**：所有 phase runner 返回时都写 `as unknown as AnimationTimeline`，抽象层未隔离 GSAP 细节。
- [ ] **`resolveSpreadSpec` 静默失败**：未注册牌阵返回空 `slots` 数组，调用方 `map`/`forEach` 产生空结果而非显式错误。
- [ ] **4xx 错误透传 `err.message`**：`app.ts` 错误处理器对 4xx 返回原始错误消息，未来若中间件附带敏感信息将直接暴露。
- [ ] **`overlay_pipeline.test.ts` 使用真实 `setTimeout`**：依赖真实时间而非 fake timers，CI 高负载时可能 flaky fail。
- [ ] **多个核心模块无直接测试**：`useOverlayLayout`、四个 `phase_runner`、`deck_calculator`、`OfflineReadingProvider` 等仅被间接覆盖。
- [ ] **`TypewriterText.vue` 未响应 `prefers-reduced-motion`**：model 层支持 `instant`，组件层未接入。
- [ ] **可访问性：overlay 缺少 dialog 语义**：无 `role="dialog"`、`aria-modal="true"`，屏幕阅读器用户无法感知模态层。
- [ ] **可访问性：阶段变化无实时播报**：洗牌→切牌→抽牌→解读过程，屏幕阅读器用户无法感知当前阶段。
- [ ] **可访问性：drag-handle 无键盘替代**：仅监听 touch 事件，键盘用户无法调整结果面板高度。

### P2 — 建议

- [ ] **CSP 完全关闭**：`app.ts` 中 `helmet({ contentSecurityPolicy: false })`，应用层无内容安全策略兜底。
- [ ] **CORS 通配模式缺少 `Vary: Origin`**：共享缓存可能返回错误缓存。
- [ ] **速率限制阈值偏宽松**：生产 120 req/min，POST /readings 等写接口可单独下调。
- [ ] **Swagger 依赖未使用**：`swagger-jsdoc` + `swagger-ui-express` 已安装但源码无引用，扩大攻击面。
- [ ] **后端常量未集中**：`server.ts` 中 `SHUTDOWN_TIMEOUT_MS`、`DEV_PORT_RETRY` 未收拢到 `config.ts`。
- [ ] **`use_overlay_controller.ts` 职责过重（729 行）**：同时承担动画编排、阅读请求生命周期、布局计算、resize 处理。违反架构约束。需拆分为独立 `useReadingController`。

> 注：**模块职责分离（use_overlay_controller 拆分）** 不在原有 TODO 规划中，是本次代码审查新发现的架构债务。

## G1 问题修复

### [ ] G1.1 收敛牌阵口径到当前主线

- 目标：文档、store、测试对“当前只正式交付 `single_card`，但架构保留扩展点”达成一致。
- 处理：修正 `PRD.md` 的牌阵表述；重构 `app/src/stores/tarot.ts` 中 `ACTIVE_SPREAD_KIND` 的硬编码策略；同步调整 `test/tarot_store.test.ts` 的断言口径。
- 验收点：`PRD.md`、运行时实现、测试断言三者一致；新增牌阵时不需要再改核心流程主干。
- 验收策略：运行相关单测并复核 `PRD.md` / `spread_registry.ts` / `tarot.ts` 的表达一致性。

### [ ] G1.2 修复 overlay 焦点管理接线

- 目标：让 `DivinationOverlay` 中已有的焦点陷阱逻辑真正生效，而不是停留在未绑定代码。
- 处理：为 overlay 根节点绑定 `ref`、键盘事件和必要语义；补真实组件级测试覆盖打开、循环、关闭后的焦点恢复。
- 验收点：`Tab` / `Shift+Tab` 不会逃出 overlay；关闭 overlay 后焦点恢复；相关组件测试无 warning。
- 验收策略：运行组件测试，并在 H5 页面手动验证键盘导航。

### [ ] G1.3 清理发布配置与权限声明

- 目标：让 `manifest.json` 与当前 H5 主线一致，消除无效小程序发布信息和不必要权限。
- 处理：移除或环境化 `mp-weixin.appid`；清理与当前产品无关的权限声明；同步文档中的发布范围说明。
- 验收点：发布配置不再携带当前主线无关的硬编码和权限；文档与配置保持一致。
- 验收策略：复核 `app/src/manifest.json`、执行 `npm run build:h5`，并确认 README / 技术文档的发布口径同步。

## G2 回归验收

### [ ] G2.1 自动化回归

- 目标：确认门禁补齐和问题修复后，主线质量能被自动化稳定拦截。
- 处理：集中执行类型检查、lint、测试、架构检查、H5 构建、服务端构建。
- 验收点：所有质量命令一次性通过；无未处理 warning；无新增门禁例外。
- 验收策略：按统一质量命令执行；保留命令输出作为验收证据。

### [ ] G2.2 关键路径与错误路径验证

- 目标：确认首页 -> 占卜 -> 结果，以及错误恢复路径都与新门禁要求一致。
- 处理：启动开发服务器，执行正常路径与网络错误路径脚本；必要时补充人工键盘和响应式验证。
- 验收点：`test/e2e_divination_flow.sh` 与 `test/e2e_network_error.sh` 均通过；H5 手动验证无焦点和布局回归。
- 验收策略：运行脚本化 E2E；补充手动验证记录，重点检查焦点管理、错误恢复、窄屏 / 宽屏布局。
