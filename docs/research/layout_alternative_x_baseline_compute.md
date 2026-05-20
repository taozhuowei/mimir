# 备选方案 X：design_baseline + useDesignSize 引擎

> 状态：备选（已暂停实施，2026-05-20 改走全网调研）
> 原因：新增组件需手动到 baseline 注册尺寸，维护成本不可接受

## 方案要点

1. 单一基准文件 `app/src/core/sizing/design_baseline.ts`：iPhone 14 Pro Max（430×932）下所有 DOM 数值（宽/高/位置/padding/margin/字号/行高/字间距/圆角/边框）写为嵌套常量树
2. 单一计算引擎 `app/src/core/sizing/use_design_size.ts`：
   - 读 baseline + 监听 onResize（H5 window resize / MP uni.onWindowResize）
   - 计算 `scale = clamp(0.715, min(w/430, h/932), 1)`
   - rAF 节流、computed 缓存
   - 暴露 `sizes / scale / viewport / isTooSmall / scaleValue`
3. 组件消费：`const { sizes } = useDesignSize()` + `:style="computed(() => ({ fontSize: sizes.value.answer.quote.fontSize + 'px' }))"`
4. too-small（<375 或 <667）：scale 钉 0.715，banner 提示，仅该状态允许滚动
5. baseline 一次抽到位，删除 `--text-*/--space-*` 等旧 token

## 优势

- 类型安全、IDE 跳转友好
- 双端公式同构，MP 端也能精确算
- 缓存与响应式天然由 Vue computed 处理

## 致命缺陷

- **新增组件 / DOM 元素必须先去 baseline 注册尺寸**，注册前组件无尺寸可消费
- 组件代码侵入度高，每个数值都要写 inline style 派生
- 团队心智模型成本：开发者要在 baseline 与组件之间反复跳转
- baseline 文件容易膨胀到数百行后失序

## 何时考虑回归此方案

- 当类型安全和精确控制比开发速度更重要时（如金融、医疗仪表盘）
- 当跨端公式同构是硬约束（特别是 MP 端不能用 transform/zoom 时）

## 关联文件

- `app/src/core/sizing/use_design_size.ts`（未创建）
- `app/src/core/sizing/design_baseline.ts`（未创建）
- 参考公式：`scale = clamp(0.715, min(viewport.w/430, viewport.h/932), 1)`
