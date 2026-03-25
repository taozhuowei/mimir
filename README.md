# AI Tarot Yes or No

## 项目介绍
AI Tarot Yes or No 是一款结合了传统塔罗神话学与现代化大型语言模型（LLM）的沉浸式 Web 占卜应用。
项目通过强大的 GSAP 物理引擎完整实现了洗牌、切牌和抽牌的 3D 动画，并巧妙利用三栏式响应式毛玻璃 UI 设计完美兼容了桌面端与移动端屏幕。
当抽取完命运的卡牌后，将会与 AI 驱动的“占卜家”建立起流式链接进行实时对话解读，提供专业且充满神秘仪式感的塔罗占卜体验。

## 目录结构
```text
/
├── app/
│   ├── src/
│   │   ├── components/      # Vue 组件 (Sidebar, DivinationOverlay 等占卜动画引擎组件)
│   │   ├── pages/           # 主体页面 (开屏页 splash, 聊天占卜首页 chat)
│   │   ├── static/          # 全局静态资源 (高阶主题解耦、字体、高质量动态/静态图标、卡背贴图)
│   │   ├── stores/          # 全局状态管理 (Pinia: 抽牌动作栈、对话记录上下文、主题皮肤配置)
│   │   ├── styles/          # 全局基础样式、原子 CSS 与主题控制变量 (global.css)
│   │   └── App.vue          # 项目根组件
│   ├── server/              # 后端服务
│   │   ├── index.js         # 基于 express 的 Server-Sent Events (SSE) 聊天流后端服务
│   │   └── LLM_config/      # LLM 解读能力设定库配置与 Prompt 结构预设
│   ├── package.json         # 前端依赖与脚手架配置
│   └── vite.config.ts       # Vite 核心配置 (跨域转发及路径别名系统)
├── PRD.md                   # 详细产品需求与开发规范文档
└── README.md                # 启动说明
```

## 启动方式

本项目推荐使用 `yarn` 管理前端应用，并使用并发运行库 (`concurrently`) 实现了一键同时启动前后端服务。

### 1. 一键启动 (Dev & Server)
在 `app` 文件夹下安装依赖，并运行任一集成指令：
```bash
cd app
yarn install
yarn dev:h5
# 或者
yarn build:h5
```
> 指令执行后：
> - 🔮 后端（AI 塔罗占卜师 SSE 服务）将自动启在 `http://localhost:3000`
> - 📱 前端（H5 沉浸视图页面引擎）将自动挂载在 `http://localhost:3001`
> 
> 在浏览器打开 `http://localhost:3001` 即可体验。

### 2. 构建生产包 (针对部署环境)
如需打包前端静态资源用于生产部署，您可以执行新增的指令：
```bash
yarn build:h5:prod
```
