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

### 5.3 GSAP Dev Tool（开发模式）

**注入条件**：仅在 `import.meta.env.DEV === true` 时注入，生产构建自动剔除。

**核心设计**：
- 使用局部 `master timeline` 控制，不污染全局 `gsap.globalTimeline`
- Dev Tool 与业务动画完全解耦，可独立控制暂停/播放/速度

**功能列表**：
| 功能 | 说明 |
|------|------|
| Pause/Resume | 暂停/继续当前动画播放 |
| 速度控制 | 支持 0.25x、0.5x、1x、2x 四档倍速 |
| Phase Replay | 重放当前阶段动画（洗牌/切牌/抽牌/翻牌） |
| 逐帧控制 | 前进/后退 1/60s 步长，精细调试动画节点 |
| Seek 跳转 | 在时间轴上任意位置跳转定位 |

**UI 形态**：悬浮于覆盖层右下角的迷你控制面板，支持拖拽定位。

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

**前端架构分层**：

- 页面渲染层：`index.vue`、`DivinationOverlay.vue`、`ResultPanel.vue` 仅负责渲染和事件绑定
- 展示控制层：`use_overlay_controller.ts`、`use_result_panel_controller.ts` 负责将状态、动画、布局结果组装为组件可消费的数据
- 动画编排层：`overlay_timeline.ts` 负责阶段顺序与时间线控制
- 动画实现层：`overlay_animations/` 下按 `shuffle / cut / draw / reveal` 分文件管理，便于单独增删替换
- 进度层：`overlay_phase_registry.ts`、`overlay_progress_model.ts`、`overlay_progress_presenter.ts` 独立管理阶段定义、进度状态与进度显示映射
- 布局层：`overlay_viewport.ts`、`overlay_card_size.ts`、`overlay_card_positions.ts`、`overlay_layout.ts`、`spread_layout.ts` 仅负责纯计算，不依赖 Vue / GSAP / DOM
- 解读层：`reading/` 目录下拆分 `provider / orchestrator / presenter`，当前实现 `offline` provider，为后续 AI provider 预留统一接口
- 打字机效果层：`typing/typewriter_model.ts` 独立管理字符推进与计时，`TypewriterText.vue` 只负责渲染

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
      use_overlay_controller.ts
      use_result_panel_controller.ts
    pages/
    stores/
    styles/
    utils/
      overlay_animations/
      reading/
      typing/
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

## 10. 术语与命名规范 (Terminology)

为保持团队沟通与代码注释的一致性，特确立以下中英文术语映射：

### 10.1 核心动画与阶段 (Phases & Animations)
- **待机/摊牌 (Idle)**：首页卡牌闲置时围绕中心呈现的扇形摊开动画。
- **洗牌 (Shuffle)**：洗牌阶段，卡牌随机滑出和并拢。
- **切牌 (Cut)**：切牌阶段，牌堆按照横向或纵向被切分为若干沓（Pile）。
- **抽牌 (Draw)**：发牌/抽牌阶段，卡牌飞向各自在此次“牌阵”中所处的位置。
- **翻牌/揭示 (Reveal)**：聚焦卡牌并将牌背翻转显示正面的阶段。
- **解读界面弹出 (Result Sheet In)**：解读面板进入视口的动画。
- **打字机 (Typewriter)**：解读文本逐字显现的动效。

### 10.2 核心流程状态 (Flow States)
- **待机 (Idle)**
- **洗牌 (Shuffling)**
- **切牌 (Cutting)**
- **抽牌 (Drawing)**
- **翻牌 (Revealing)**
- **解读 (Result)**

### 10.3 界面元素 (UI Elements)
- **流程指示器 (Phase Progress Bar)**：顶部的阶段进度图标。
- **卡牌 (Card)**：单个实体的牌。
- **牌堆 (Deck / Pile)**：切牌前所有的卡牌重叠在一起的状态，以及切牌后分开的几个小摞。
- **牌阵 (Spread)**：卡牌落点形成的布局（如单张、三张、十字）。
- **按钮 (Button)**：页面中的可交互点击元素。
- **解读分栏/解读卡片 (Result Zone / Panel)**：抽牌结束后展示详细解释和文字的界面。
- **间距常量 (Gap)**：卡牌或牌堆之间需要保持的留白距离。
