# Scales Tarot

以塔罗牌权衡利弊，帮助用户做出二选一抉择。

## 项目简介

Scales Tarot 是一款聚焦二选一决策场景的塔罗占卜工具。当面对两难选择时，通过洗牌、切牌、抽牌的仪式感流程，让三张塔罗牌的综合能量给出倾向性指引。

核心特征：

- 即开即用，无登录、无主题切换、无多余分支
- 本地解读，基于 78 张塔罗牌情感极性计算结果
- 单页流程，整个占卜过程在同一页面中通过状态与动画切换完成
- 复古羊皮纸风格 + 黄铜金色 + GSAP 仪式感动效

## 目录结构

```text
/
├── app/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DivinationOverlay.vue
│   │   │   └── ResultPanel.vue
│   │   ├── data/
│   │   ├── pages/
│   │   │   └── index/
│   │   ├── stores/
│   │   ├── styles/
│   │   └── utils/
│   ├── test/
│   └── package.json
├── docs/
│   ├── PRD.md
│   └── README.md
```

## 启动方式

### 安装依赖

```bash
cd app
npm install
```

### H5 开发

```bash
npm run dev:h5
```

### 类型检查

```bash
npm run type-check
```

### 单元测试

```bash
npm run test:unit
```

## 使用流程

1. 打开首页，看到标题和中心神秘圆环。
2. 心中默想面临的两难选择，轻触圆环进入占卜流程。
3. 依次完成洗牌、切牌、抽牌三个阶段。
4. 三张牌翻开后，查看整体倾向（积极 / 消极 / 尚不明朗）和摘要。
5. 向下阅读每张牌的详细牌义与启示。
6. 点击"再占一次"重置，回到起始状态。

## 解读逻辑

- 正位 positive 计为 `+1`
- 正位 negative 计为 `-1`
- 逆位使用逆位含义对应的情感极性
- 总分 > 0 倾向积极，< 0 倾向消极，= 0 为尚不明朗

## 验证说明

- `npm run type-check` 校验 Vue + TypeScript 代码结构
- `npm run test:unit` 运行核心逻辑单元测试
