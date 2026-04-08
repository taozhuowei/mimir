# Scales Tarot

以塔罗牌权衡利弊，帮助用户做出二选一抉择。

## 项目简介

Scales Tarot 是一款聚焦二选一决策场景的塔罗占卜工具。用户心中默想面临的两难选择，经由洗牌→切牌→抽牌的仪式感流程，由三张塔罗牌的综合能量给出倾向性指引（Yes / No）。

整个占卜过程在同一页面内通过状态与动画切换完成，无路由跳转，无登录，即开即用。

---

## 核心架构

```
前端（Vue 3 + uni-app）            后端（Express）
┌──────────────────────┐          ┌────────────────────────┐
│  页面加载            │─────────▶│  GET /api/v1/cards      │
│  （获取 78 张牌数据）│          │  返回全量牌数据+图片URL  │
│                      │          └────────────────────────┘
│  本地抽牌            │
│  drawThreeCards()    │          ┌────────────────────────┐
│  （Fisher-Yates）    │─────────▶│  POST /api/v1/readings  │
│                      │          │  输入：3 张牌+正逆位    │
│  展示解读结果        │◀─────────│  输出：score+result+牌义│
└──────────────────────┘          └────────────────────────┘
                                  ┌────────────────────────┐
                                  │  GET /static/*          │
                                  │  托管图片、字体、图标   │
                                  └────────────────────────┘
                                  ┌────────────────────────┐
                                  │  H5 SPA fallback        │
                                  │  dist/build/h5/         │
                                  └────────────────────────┘
```

**占卜状态机**（由 `stores/tarot.ts` 管理）：

```
idle → shuffling → cutting → drawing → revealing → result → idle
```

**解读规则**（后端计算）：

- 正位 positive → `+1`，正位 negative → `-1`，neutral → `0`
- 逆位取逆位含义的情感极性，同上规则
- 总分 > 0 → `yes`，< 0 → `no`，= 0 → `uncertain`

**构建目标**：H5（浏览器）+ 微信小程序（`mp-weixin`），共用同一套源码。

---

## 目录结构

```
/
├── app/                          # 前端（Vue 3 + uni-app + TypeScript）
│   ├── src/
│   │   ├── api/                  # HTTP 客户端层
│   │   │   ├── client.ts         # axios 封装，统一 baseURL
│   │   │   ├── cards.ts          # GET /api/v1/cards
│   │   │   └── readings.ts       # POST /api/v1/readings
│   │   ├── components/
│   │   │   ├── DivinationOverlay.vue  # 全屏仪式动画层（洗/切/抽牌）
│   │   │   └── ResultPanel.vue        # 结果展示面板
│   │   ├── pages/index/          # 主页（唯一页面，单页流程）
│   │   ├── stores/tarot.ts       # Pinia 占卜状态机
│   │   ├── styles/global.css     # 全局样式
│   │   ├── utils/
│   │   │   ├── tarotReading.ts   # 类型定义 + drawThreeCards()
│   │   │   └── result_panel.ts   # 结果文案生成工具函数
│   │   └── constants.ts          # 全局常量（API 地址等）
│   ├── vite.config.ts
│   └── package.json              # workspace 占位（无依赖）
│
├── server/                       # 后端（Express + TypeScript）
│   ├── public/static/            # 静态资源（塔罗牌图片、字体、图标）
│   └── src/
│       ├── data/                 # 78 张塔罗牌 JSON（major + 四花色）
│       ├── routes/
│       │   ├── cards.ts          # GET /api/v1/cards
│       │   └── readings.ts       # POST /api/v1/readings
│       ├── services/
│       │   ├── card_loader.ts    # 加载并合并牌数据，注入图片 URL
│       │   └── tarot_reading.ts  # 评分计算，生成 ReadingResult
│       └── server.ts             # 入口：路由挂载 + H5 SPA 托管
│
├── test/                         # 独立单元测试子项目（vitest）
│   ├── result_panel.test.ts
│   ├── tarotReading.test.ts
│   ├── vitest.config.ts
│   ├── package.json
│   └── README.md
│
├── dist/build/h5/                # H5 构建产物（npm start 后生成，已 gitignore）
├── package.json                  # 根工作区，唯一入口脚本 npm start
├── .npmrc                        # legacy-peer-deps=true（pinia@3 兼容）
└── PRD.md                        # 产品需求文档
```

---

## 启动

### 安装依赖

```bash
npm install
```

### 全流程启动（类型检查 → 编译 → 启动服务器）

```bash
npm start
```

执行顺序：

1. TypeScript 类型检查（前端 + 后端）
2. H5 与微信小程序同步编译（terser 最小化）
3. 启动后端服务器，同时托管编译好的 H5

H5 访问地址：`http://localhost:3000`

微信小程序产物目录：`dist/build/mp-weixin/`（导入微信开发者工具）

### 单独运行测试

```bash
npm test -w test
```
