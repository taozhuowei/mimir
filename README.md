# Scales Tarot

Scales Tarot 是一个以 H5 为主要交付形态的单页塔罗体验项目。它强调短路径、仪式感与稳定反馈，让用户在一个页面内完成抽牌、揭示与获取答案。

仓库目标不只是维护一个可运行页面，还要建立一套清晰、可持续、不过度依赖特定 AI 工具的演进方式：任何新协作者只依赖仓库内文档即可理解项目、执行任务并验证结果。

## 当前范围

- 正式范围：H5 网站。
- 主线：文档基线、工程质量基线、架构收敛、发布治理。
- 不在主线：小程序发布、账号体系、支付、社交分享、AI 答案扩展。

## 产品需求

用户进入首页后，在同一页面内完成牌阵选择、仪式化抽牌、结果揭示与答案呈现，全程无需跳转。产品以最短路径、稳定反馈与一致视觉氛围，提供一次完整、可信、可重复的占卜体验。当前正式范围为 H5 与单张牌阵（`single_card`），不含账号、历史记录、支付、社交分享、多主题切换与小程序发布。

核心链路：待机视图（摊牌动画引导）→ 点击触发 → 占卜视图（洗牌 / 切牌 / 抽牌 / 翻牌仪式动画）→ 结果卡牌定格 → 结果视图（宽屏分栏 / 窄屏抽屉，答案卡呈现一句名句的原文 / 翻译 / 来源）→ 决策（再占一次 / 回到首页 / 异常重试）。

详细需求按模块拆分于 [docs/](docs/)：

- [docs/product.md](docs/product.md) — 目标、用户、范围、视觉方向、非功能要求、验收重点
- [docs/state.md](docs/state.md) — 状态机：流程阶段、占卜相位、视图与阶段对应、用户流程、异常恢复
- [docs/view.md](docs/view.md) — 视图与视觉层、视图相关功能需求、交互原则
- [docs/animation.md](docs/animation.md) — 动画分帧、视图过渡动画、动效规范
- [docs/glossary.md](docs/glossary.md) — 项目术语表

## 目录架构

yarn workspaces 单体仓库，顶层只列一级；各目录职责与内部结构见其自身 README。

```
scales-tarot/
├── app/                  # 应用容器(前端 + 后端两个 workspace)
│   ├── frontend/         # uni-app + Vue 3 前端(h5 + mp-weixin 双产物)        → app/frontend/README.md
│   └── server/           # Express 4 + zod 后端(:4124)                       → app/server/README.md
├── config/               # 根级工具配置 + 构建编排/质量门禁脚本(scripts/)       → config/README.md
├── docs/                 # 产品需求模块文档(索引见本 README「产品需求」节)
├── .github/              # CI(verify + lint + build) / dependabot / PR 模板
├── dist/                 # 构建产物(gitignored)
├── CLAUDE.md             # Claude Code 工程导航与硬约束
├── README.md             # 本文件
├── package.json          # workspaces 根(仅 prepare/dev/prod 3 个脚本)
└── yarn.lock
```

## 技术栈

- **单体仓库**：yarn workspaces（`app/frontend` + `app/server`），Node 22。
- **前端**：uni-app + Vue 3.4 + Pinia + GSAP，vite 构建，vitest 测试。
- **后端**：Express 4 + zod，pino 日志，vitest + supertest 测试。
- **工程**：单一构建入口 + 代码门禁（lint / 类型 / 测试 / 架构 / 死代码 / 重复），simple-git-hooks + CI 双重兜底。

命令详解见 [CLAUDE.md](CLAUDE.md) 的 “Commands”；环境变量与部署见下方对应小节。

## 快速开始

```bash
yarn install
yarn dev
```

打开 [http://localhost:4123/](http://localhost:4123/) 看 H5 实时预览。`dev`/`prod` 命令详解见 [CLAUDE.md](CLAUDE.md)，环境变量与部署见下方小节。

## 环境变量

配置存 `.env.*.local`，**永不进 git**，每台机器各一份。

### 前端（vite 编译时烤进 bundle）

| 变量 | 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | 前端访问后端的完整 URL |

### 后端（Node.js 启动时读）

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `NODE_ENV` | development | 运行模式 development / production |
| `HOST` | dev `0.0.0.0` / prod `127.0.0.1` | 监听地址（dev 用 0.0.0.0 让局域网访问，prod 绑回环交 nginx 反代） |
| `PORT` | 4124 | 后端端口 |
| `CORS_ORIGIN` | 空 | 允许跨域来源，逗号分隔；空 = prod 同源、dev 全放行；`*` = 任意（仅 dev） |
| `LOG_LEVEL` | dev `debug` / prod `info` / test `silent` | pino 级别：trace/debug/info/warn/error/fatal/silent |

`.env.development.local` 由 `yarn dev` **自动生成**（探测局域网 IP 写入 `VITE_API_BASE_URL=http://<你的 IP>:4124`），无需手编；手机连同一 WiFi 调小程序连不上时，检查该 IP 是否为电脑当前真实 IP（换 WiFi 会变，重跑 `yarn dev` 自动更新）。

部署前手动创建 `.env.production.local`：

```bash
# .env.production.local（不进 git）
VITE_API_BASE_URL=https://your-domain.com
```

后端运行时变量（`NODE_ENV` / `HOST` / `PORT` / `CORS_ORIGIN` / `LOG_LEVEL`）通常**不写文件**，由生产服务器系统环境变量注入（systemd EnvironmentFile / Docker `-e` 等）。

## 部署

`yarn prod` 产出后：

- `dist/build/h5/` 拷到前端服务器（或交 nginx serve）。
- `app/server/dist/` + `node_modules` 拷到 server 主机，`NODE_ENV=production node app/server/dist/server.js` 启动（默认 `127.0.0.1:4124`，由 nginx 反代）。

## 协作指导

1. 开始任何任务前，先读本 README「产品需求」节与 [TODO.md](TODO.md)。
2. 产品范围变化先更新 [docs/product.md](docs/product.md)；执行节奏变化先更新 [TODO.md](TODO.md)。
3. 所有代码改动必须附带验证证据，至少覆盖类型检查、测试或构建中的必要项。
4. 文档必须能被人类开发者直接理解，AI 仅为辅助工具，不得成为唯一知识入口。
5. 工程硬约束与质量门禁见 [CLAUDE.md](CLAUDE.md)。

## 使用与授权说明

本仓库**不是开源项目**，默认采用「保留所有权利（All Rights Reserved）」方式管理。

未经项目所有者书面授权，禁止：

- 将本项目或其衍生版本用于商业用途；
- 对外提供托管、售卖、转授权或二次分发；
- 公开镜像、公开转载或以开源项目名义再次发布；
- 将项目中的设计、文案、素材或实现整体挪作其他商业产品。

允许范围仅限经授权的内部协作、评审、学习与受控开发活动。
