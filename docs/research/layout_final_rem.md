# 最终方案：rem + lib-flexible（双轴 + 单轴宽度公式 + PostCSS 自动转换）

> 状态：已选定为最终方案（2026-05-20）
> 备选档：[方案 X baseline+useDesignSize](./layout_alternative_x_baseline_compute.md)、[方案 E PostCSS dpx](./layout_alternative_e_postcss_dpx.md)

## 方案要点

1. 设计稿基准：iPhone 14 Pro Max（430×932 CSS px）。源码按此基准直接写 px
2. 下限：iPhone 8（375 宽）。低于此屏宽显示 banner 并允许滚动；其他情况禁止滚动
3. 上限：14PM 之上停止放大，桌面背景填充屏幕，界面横向居中
4. 缩放公式：`rootFontSize = clamp(0.872, viewport.w / 430, 1) × 43`（单轴宽度）
5. 自动转换：postcss-pxtorem 编译期把源码 `Npx` 自动转 `Nrem`，rootValue=43
6. 运行机制：自研 lib-flexible（< 30 行）inline 注入 `<head>` 计算 root font-size，监听 resize / orientationchange，rAF 节流
7. JS 拼接 px 路径：项目内 `dpx(n)` helper 替代裸 px，所有 GSAP / style_sync / animation 字符串改用
8. 跨端：H5 走 lib-flexible + postcss-pxtorem；mp-weixin 保持现状（产品决策接受跨端视觉差）

## 关键参数

- `BASELINE_W = 430`、`BASELINE_H = 932`（iPhone 14 Pro Max）
- `FLOOR_W = 375`、`FLOOR_H = 667`（iPhone 8）
- `REM_BASE = 43`（= 430 / 10）
- `FLOOR_RATIO = 0.872`（= 375 / 430，单轴宽度）
- `CEILING_RATIO = 1`（= 14PM 钉死）

## 视口实测预期

- iPhone 8（375×667）：scale=0.872，体验=按 iPhone 8 等比缩，**高度溢出垂直滚动**
- iPhone SE（375×667）：同上
- iPhone 14（390×844）：scale=0.907
- iPhone 14 Pro Max（430×932）：scale=1.0
- iPad 竖屏（768×1024）：scale=1.0，两侧背景填空
- 桌面 1280×800：scale=1.0，两侧背景填空，垂直可能小于 932 → 顶底背景填空 / 滚动 fallback
- 桌面 1920×1080：scale=1.0
- < 375 屏宽：scale 钉 0.872，banner 提示，允许滚动

## 缺陷规避表

| 缺陷 | 规避手段 | 实施位置 |
|---|---|---|
| FOUC | lib-flexible JS inline 注入 `<head>` blocking 执行 | index.html 入口 |
| subpixel 1px 边框 | postcss-pxtorem 配 `minPixelValue: 2` + `propList: ['*', '!border', '!border-*']` | postcss.config.js |
| JS inline style 不转 | 统一 `dpx(n)` helper + ESLint 禁裸 px 字面量 | core/sizing/dpx.ts + .eslintrc |
| mp 端语义割裂 | 产品决策接受，后续可补 postcss-pxtorpx | 单独债务记录 |
| 隐式契约无机器守护 | stylelint 白名单规则，限定 baseline 数值集合 | stylelint.config |
| user font-size 强行覆盖 | lib-flexible 不写 user 修改路径（业内 H5 项目默认） | design_flexible.ts |
| 1px 边框 propList 排除 | 见 subpixel 一行 | 同 |
| 重复 reflow | rAF 节流 + dimension diff 短路 | design_flexible.ts |

## 不解决（已认可取舍）

1. 用户浏览器 zoom × rem 叠加场景（WCAG 1.4.4 用户字号放大）：项目主交付为 H5 体验型应用，与无障碍 a11y 合规不在本期范围
2. mp 端跨屏视觉一致性：本次重构仅 H5，mp 端语义割裂为已知技术债

## 关联代码（实施后）

- `app/src/core/sizing/design_baseline.ts`（基准常量）
- `app/src/core/sizing/design_flexible.ts`（自研 lib-flexible）
- `app/src/core/sizing/dpx.ts`（运行时 helper）
- `app/index.html`（FOUC 防护注入）
- `app/postcss.config.js` 或 vite.config.ts 内 `css.postcss.plugins`
- `app/src/flows/shared/components/TooSmallBanner.vue`
