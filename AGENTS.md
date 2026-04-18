# Agent 协作规则

> 本文件对当前目录及所有子目录下的 AI Agent 行为具有约束力。
> 若用户指令与本文件冲突，以用户直接指令为准。

---

## 角色分工

| 角色 | 负责 | 不负责 |
|---|---|---|
| **Claude（规划者）** | 需求分析、架构设计、决策制定、验收标准、编写实施计划 | 不写具体实现代码、不做批量文件修改 |
| **Kimi（执行者）** | 代码生成、文件操作、测试运行、性能验证、文档同步 | 不做架构级决策、不绕过审查清单强行合并 |

**边界原则**：遇到设计歧义、技术选型冲突或验收标准不清时，执行方须暂停并上报，由规划方确认后再继续。

---

## 项目上下文

- **项目名称**：Scales Tarot
- **技术栈**：Vue 3 + uni-app + TypeScript（前端），Express + TypeScript（后端）
- **关键目录**：
  - `app/` — 前端源码与构建配置
  - `server/` — 后端源码与 API
  - `test/` — Vitest 单测、接口测试与脚本化黑盒验证
  - `dist/` / `server/dist/` — 构建产物
- **当前阶段**：以 `TODO.md` 为准；当前主线为工程质量基线、前端架构收敛和发布治理
- **权威文档**：
  - 产品范围：`PRD.md`
  - 执行计划：`TODO.md`
  - 技术规范：`docs/technical_architecture.md`

> 历史阶段总结不再在本文件重复维护，避免与上述权威文档出现双重口径。

---

## 工作协议

### 1. TODO 先行
除纯延续对话外，任何任务开始前必须先核对 `TODO.md` 的实际状态与代码现状是否一致。

### 2. 即时更新 TODO
任务开始、取得阶段性进展、完成时，必须**立即**更新 `TODO.md` 状态，禁止批量延迟到对话末尾统一更新。

### 3. 状态严格流转
- `[ ]` 待开始 → `[~]` 进行中 → `[?]` 待验收 → `[x]` 已完成
- 遇到阻塞、依赖外部条件或方案待评审时，转为 `[!]` 待确认，并在文档中注明原因。

### 4. 验收闭环
每个标记为 `[x]` 的任务必须对应一个可验证的验收点：测试通过、构建成功、或手动验证日志/截图。

### 5. 零容忍技术债
重构必须一次性完成，禁止留下 shim 层、死代码或重复类型定义。若受时间限制无法彻底完成，须将剩余工作拆分为新的 `[!]` 待确认项，而不是假装已完成。

### 6. 魔法数字集中化
任何新增或修改的固定数值（比例、尺寸、超时、阈值）必须收拢到配置文件/常量文件中，禁止散落。

### 7. 性能红线
动画相关代码修改后，必须确认：
- 无无条件永久挂载的 `will-change`
- 无 GSAP `onUpdate` 中的大量字符串拼接
- resize 不会与运行中 tween 冲突

---

## 关键操作命令

### 测试
```bash
# 单元/集成测试（必须在 test/ 目录下运行，否则 Vue 组件测试会失败）
cd test && npx vitest run

# 前端 H5 构建（含类型检查）
npm run build:h5

# 后端构建
npm run build:server
```

### 开发服务器
```bash
# 启动 Express 开发服务器（提供 API + 静态 H5 构建产物）
node server/dist/server.js
# 默认端口 3000，API 前缀 /api/v1/*
```

### 端到端测试
```bash
# 正常路径：首页 → 占卜 → 结果 → 回到首页
bash test/e2e_divination_flow.sh

# 错误路径：后端 500 → 错误 UI → 卡牌复用验证
bash test/e2e_network_error.sh

# 前置条件：agent-browser 已安装，dev server 运行在 localhost:3000
```

---

## 关键架构决策

### GSAP 动画
- 使用 `gsap-core.js`（通过 Vite alias），排除 CSSPlugin，避免 DOM-only API 在小程序中不可用
- 不引入额外插件，核心方法（`gsap.to`、`gsap.timeline`、`gsap.killTweensOf`）已覆盖全部需求
- 已验证 `gsap-core.js`（172KB）是最小粒度，无可进一步 tree-shake 空间

### 布局系统
- `draw_stage` 与 `result_stage` 使用独立的布局计算（`resolveSceneLayout`）
- `resultCardLiftY` 在 narrow 模式下自动上移卡牌，避免结果面板遮挡
- 所有卡牌尺寸通过 `clamp()` + `rpx` 响应式适配，宽屏断点 768px

### 主题系统
- 当前仅支持 `golden_dawn` 单一主题
- CSS 自定义属性集中在 `.divination-overlay` scoped style 中（`--color-overlay-bg` 等）
- `theme.ts` store 已存在但未完全消费所有令牌，主题切换功能需后续单独规划

### 后端 API
- `POST /api/v1/readings` — Zod 校验，`spreadKind` + 卡牌数量匹配校验
- 错误格式统一：`{ error: string, code?: string }`
- 内部错误返回 500，校验错误返回 400

---

## 已知限制

| 限制 | 说明 | 后续处理 |
|------|------|------------|
| 无暗色/浅色模式 | 仅 `golden_dawn` 主题 | 暂不进入当前主线 |
| DevTools 无自动化测试 | 仅在 `import.meta.env.DEV` 显示 | 以开发环境手动验证为主 |
| entry animation 时长未调优 | 当前约 1.5s，可能偏长 | 进入体验优化时再评估 |
| 洗牌/切牌阶段时长固定 | 未按牌阵复杂度自适应 | 进入体验优化时再评估 |
| 小程序适配未开始 | H5 优先，MP 暂不发布 | H5 稳定后再单独规划 |

---

## 审计循环工作流程

默认采用 **开发 → 审计 → 修复 → 再审计** 的闭环模式：

1. **开发 agent**（coder）执行修复任务
2. **独立审计 agent**（explore）只读验证，报告 PASS/FAIL + 具体证据
3. 若审计 FAIL，开发 agent 修复残留问题
4. 审计 agent 再次验证，直至 ALL PASS
5. 提交代码，更新 TODO.md

**规则**：禁止跳过审计、禁止自己审计自己、禁止遗留 P0/P1 问题。

---

## 代码审查 Checklist（强制自检）

任何文件修改完成后，执行方应在提交前自检以下 8 项：

1. 是否存在死代码或重复代码？
2. 新增魔法数字是否已集中配置？
3. 动画/样式更新是否存在性能隐患（will-change、字符串拼接、onUpdate 滥用）？
4. 类型定义是否严格，无隐式 `any`？
5. 测试是否覆盖正向与至少一个边界场景？
6. 安全区/视口/响应式是否在多尺寸下验证？
7. 后端路由是否有输入校验与异常处理？
8. `TODO.md` / `README.md` / `CONTRIBUTING.md` / `AGENTS.md` 是否同步更新？
