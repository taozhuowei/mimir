# Scales Tarot

Scales Tarot 是一个基于 `Vue 3 + uni-app + TypeScript + Express` 的单页塔罗占卜应用。前端负责仪式化抽牌动画和结果展示，后端负责牌库与解读计算，并同时服务 H5 静态产物与 API。

## 项目结构

```text
app/       # uni-app frontend
server/    # Express + TypeScript backend
test/      # Vitest test workspace
dist/      # frontend build output
```

## 开发命令

先安装依赖：

```bash
npm install
```

本地开发：

```bash
npm start
```

或：

```bash
npm run dev
```

`dev` 会执行这些步骤：

1. 生成 `.env.development.local`，写入当前局域网 API 地址。
2. 执行前后端 TypeScript 类型检查。
3. 以开发模式并行启动：
   - H5 watch 构建
   - 微信小程序 watch 构建
   - `tsx server/src/server.ts` 开发服务

## 测试与校验

类型检查：

```bash
npm run type-check
```

单元测试：

```bash
npm test -w test
```

## 生产构建

生产构建：

```bash
npm run build
```

`build` 会执行：

1. 前后端类型检查
2. H5 与微信小程序生产构建
3. `server/src` 编译到 `server/dist`

当前生产构建策略：

- 前端使用 Vite `production` mode
- JS 使用 `terser` 压缩
- 开启 `mangle`
- 删除 `console` 与 `debugger`
- 关闭生产 sourcemap
- 输出可直接运行的 `server/dist/server.js`

运行生产构建产物：

```bash
npm run start:prod
```

默认访问：

- H5: `http://localhost:3000`
- Health Check: `http://localhost:3000/api/health`

## 当前交互特性

- 覆盖层动画流程：洗牌 → 切牌 → 抽牌 → 解读
- 抽牌完成后自动进入解读，无需额外点击
- 结果区全量文本打字机动效
- `positive / negative` 结果着色
- 仅开发模式显示悬浮 Dev Tools：
  - 快速回到指定阶段重放
  - `0.5x / 1x / 2x`
  - 暂停 / 继续

## 注意事项

- 服务启动前会检测端口占用，优先尝试 `3000`
- `server/dist/`、`dist/` 已在 `.gitignore`
- 生产模式不会渲染 Dev Tools
