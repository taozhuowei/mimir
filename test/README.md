# Test Workspace

`test/` 是 Scales Tarot 的测试工作区，负责承载前端纯逻辑测试、后端接口契约测试，以及脚本化黑盒验证。

---

## 运行方式

在仓库根目录运行：

```bash
npm test -w test
```

或直接进入测试工作区运行：

```bash
cd test && npx vitest run
```

---

## 测试内容

- 前端纯逻辑：布局、尺寸、动画阶段、presenter、orchestrator
- 组件与集成：页面、组件、状态协作
- 后端接口：健康检查、卡牌接口、解读接口、中间件行为
- 脚本化验证：关键用户路径与异常路径
