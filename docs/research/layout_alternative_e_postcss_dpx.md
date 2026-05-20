# 备选方案 E：PostCSS plugin + CSS 变量 --dpx 自动缩放

> 状态：备选（已暂停实施，2026-05-20 转向 rem 方案调研）
> 原因：用户希望先评估 rem 系方案的可行性

## 方案要点

1. 设计稿基准 iPhone 14 Pro Max（430×932），源码按此基准直接写 px
2. 下限 iPhone 8（375 宽）。低于此屏宽显示 banner 并允许滚动；其他情况禁止滚动
3. 上限 14PM 之上停止放大，桌面背景填充屏幕，界面居中
4. CSS 变量 `--dpx` 代表 1 设计 px 在当前视口下的真实长度，按宽度比例缩放并钳制上下限
5. 自研 PostCSS plugin，把源码 `Npx` 自动包成 `calc(N * var(--dpx))`
6. 浏览器原生 calc，无 JS 监听、无视觉缩放
7. 跨端：H5 走 plugin + var；mp-weixin 本次保持现状

## 主要缺陷

1. subpixel 渲染失真（DPR≥2 缓解，DPR=1.5 可见）
2. 移动端 100svh / 100svw 极端场景仍可能微动
3. mp 端语义割裂，源码同一字面量两端渲染长度不同
4. 隐式契约无类型 / lint 机器守护
5. 逃逸机制只能用字符串约定（ignore 注释、大写 PX）
6. 用户浏览器 zoom 与 --dpx 叠加无定义
7. DevTools 显示 calc 表达式，调试需反推
8. 无统一整数取整收口

## 何时考虑回归此方案

- 当团队接受 PostCSS 范式 + 隐式转换契约
- 当 mp 端语义割裂是已认可的产品取舍
- 当无障碍 / 用户 zoom 不在合规范围

## 关联文件（未创建）

- PostCSS plugin（< 80 行）
- global.css 顶部 `--dpx` 公式定义
- App 根容器 `design-root` 样式
