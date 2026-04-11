# 项目需求文档（PRD）

## 1. 项目概述

**项目名称**：Scales Tarot  
**当前阶段**：MVP

Scales Tarot 提供一个单页、快速、具有仪式感的塔罗占卜体验。用户在首页进入仪式流程，完成洗牌、切牌、抽牌与结果揭示后，在同页查看最终结论与逐张牌义解读。

## 2. 核心目标

1. 用最短路径完成一次占卜。
2. 用后端牌库与规则解读生成 `positive / negative` 结果。
3. 用克制但连续的动效强化“神谕显现”的体验，而不是页面跳转。

## 3. 用户流程

1. 用户进入首页。
2. 首页展示标题、牌堆和设置入口。
3. 用户点击牌堆进入占卜流程。
4. 覆盖层自动串联执行：
   - 洗牌
   - 切牌
   - 抽牌
   - 翻牌与解读揭示
5. 抽牌完成后停顿约 `800ms`，再进入解读阶段。
6. 用户在首屏看到：
   - 结果陈述文案
   - 对应牌阵
   - 逐张牌义文本
7. 用户点击“再占一次”回到首页初始态。

## 4. 页面与交互结构

### 4.1 单页状态机

- `idle`
- `shuffling`
- `cutting`
- `drawing`
- `revealing`
- `result`

### 4.2 首页状态

- 标题：`Scales Tarot`
- 中心视觉：牌堆与微弱法阵
- 右上角：设置入口
- 设置项：`single_card` / `three_card` / `cross_spread`

### 4.3 覆盖层状态

- 使用 `DivinationOverlay.vue` 作为全屏动画层
- 顶部使用四枚主题 icon 作为阶段进度指示
- 前两枚 icon 做视觉尺寸补偿
- 仅开发模式显示悬浮 Dev Tools

### 4.4 结果状态

- 结果内容仍在同页展开
- 结果主文案与解读文本使用打字机动效
- `positive / negative` 结果应用对应色彩强调
- 支持“再占一次”重置

## 5. 视觉与动效约束

### 5.1 视觉风格

- 保持复古羊皮纸、黄铜金色、低饱和暖色调
- 不引入破坏主题的全新视觉体系
- 正负结果只做局部强调，不改变整体基调

### 5.2 动效原则

- 延续现有 GSAP 动画语言
- 自动串联洗牌、切牌、抽牌、翻牌
- 抽牌结束后增加短暂停顿，再进入解读
- 打字机效果应兼容 `prefers-reduced-motion`
- 仅开发模式提供动画调试控制

## 6. 解读系统规则

### 6.1 数据来源

- 78 张塔罗牌数据由后端提供
- 静态资源由主题系统提供

### 6.2 判定规则

- `positive` 计正分
- `negative` 计负分
- `neutral` 计 0

### 6.3 结果生成

- 总分大于 0：`positive`
- 总分小于 0：`negative`
- 总分等于 0：按正位 / 逆位数量打破平局

## 7. 技术方案

### 7.1 前端

- `Vue 3`
- `uni-app`
- `Pinia`
- `GSAP`
- `Vite`

### 7.2 后端

- `Express`
- `TypeScript`
- API：
  - `GET /api/v1/cards`
  - `POST /api/v1/readings`
  - `GET /api/v1/themes`
  - `GET /api/v1/themes/:id`

### 7.3 构建与运行

- `npm start` / `npm run dev`：开发模式
- `npm run build`：前端生产构建 + 服务端编译
- `npm run start:prod`：运行生产构建产物
- 前端生产构建需启用压缩与混淆

## 8. 代码结构

```text
app/
  src/
    components/
    composables/
    pages/
    stores/
    styles/
    utils/
server/
  src/
  public/static/
test/
```

## 9. 测试与验收

### 9.1 自动化验证

- `npm run type-check`
- `npm test -w test`
- `npm run build`

### 9.2 手动验收重点

- 覆盖层自动从洗牌串到结果
- 抽牌结束后存在约 `800ms` 的停顿
- 结果区文本逐步打出
- `positive / negative` 色彩正确
- Dev Tools 仅在开发模式出现
- 生产构建产物可通过 `start:prod` 正常启动
