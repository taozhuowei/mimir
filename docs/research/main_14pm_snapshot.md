# main 分支 14PM 视觉快照（feature 端 rem 链对照源）

> 在 main 分支 `node scripts/build/index.js --dev --target h5,server --skip-quality`
> 拉起 dev，chromium viewport 430×932 / dpr 2 截图与 computed style
> 采集。原始 JSON 已废弃（一次性产物），下表是冻结后的对照源。
>
> 采集方式：page.evaluate 遍历 `#app *` 的 getBoundingClientRect +
> getComputedStyle；过滤零尺寸/SVG 节点。

## 全局基线

- viewport：430 × 932 CSS px，devicePixelRatio = 2
- `<html>` font-size：18.3467px（main 分支 16 × k；k = 430/375 ≈ 1.1467）
- `data-too-small`：null（main 分支无该属性）
- `<page>` font-size：16px，line-height：25.6px（继承自 uni-app 默认）
- 字色：#1E0F06 (primary) / #4A2510 (secondary) / #7A4E28 (tertiary) /
  #A67C4E (muted)
- 整页 rpx 链路：1rpx = 430/750 ≈ 0.5733px

## 容器层

- `.main-page`：430×932，padding 0，overflow hidden
- `.canvas`：430×932（盒子等于 viewport），max-width: 440px
- `.play-view`：430×932，padding 18px 四边一致
- `<uni-app>` / `<uni-page>` / `uni-page-wrapper`：均铺满 430×932

## Header（idle 态）

- `.header-area`：bbox 18,50 394×92，margin-top 32px
- `.title-content.title-content--idle`：bbox 18,50 394×103，
  padding-top 24px，gap 4px（children 之间）

## 文本节点（idle 态）

- **主标题 "Scales Tarot"**
  font-size 37px / line-height 37px / letter-spacing 6.66px /
  font-weight 600 / color #1E0F06 / font-display
  bbox 48,67 334×50
- **副标题 "命运之轨 · 星辰之语"**
  font-size 14px / lh 16.8px / ls 4.9px / fw 400 / color #4A2510
  bbox 125,114 180×17
- **指引 "轻触牌堆，聆听高维指引"**
  font-size 14px / lh 16.8px / ls 1.12px / fw 400 / color #7A4E28
  bbox 132,135 166×17
- **提示 "TOUCH TO DIVINE"**
  font-size 11.4667px / lh 18.3467px / ls 2.8667px / fw 600 /
  color #A67C4E / font-display
  bbox 139,851 153×15

## Stage / 卡牌堆（idle 态扇形）

- `.stage.stage--idle`：bbox 18,142 394×772（占满 header 之下）
- `.deck.idle-deck-content`：同 stage 满覆盖
- `.fan-stack`：bbox 159,438 113×180（扇形居中点）
- 六张扇形缩略图 `.idle-deck-content__card`：
  - W 范围 125–206 / H 范围 188–212
  - border-radius 5.7333px（= 10rpx）
  - 主要垂直区间 y 430–646
- `.idle-deck-content__hint`：bbox 18,850 394×18，gap 13.76px
  - 装饰线 `.hint-line`：bbox 96,858 29×1
  - 文字偏移：见上方 TOUCH TO DIVINE

## Notification（顶部横幅占位）

- `.notification-host`：bbox 0,0 430×18（贴顶满宽）
- padding 9.1733px / gap 6.88px

## Dev Tools（折叠态，右下圆按钮）

- `.dev-tools.dev-tools--collapsed`：bbox 378,880 40×40，border-radius 50%
- `.dev-tools-handle`：38×38
- `.dev-tools-handle__icon "⚡"`：font-size 22px / lh 22

## 关键数值字典（feature rem 端写 px 时直接用）

| 元素 | 14PM 像素值 |
| --- | --- |
| play-view 内边距 | 18 |
| header-area margin-top | 32 |
| title-content padding-top | 24 |
| title-content children gap | 4 |
| 主标题 font-size / lh / ls | 37 / 37 / 6.66 |
| 副标题 font-size / lh / ls | 14 / 16.8 / 4.9 |
| 指引 font-size / lh / ls | 14 / 16.8 / 1.12 |
| TOUCH TO DIVINE font-size / lh / ls | 11.47 / 18.35 / 2.87 |
| 卡牌缩略图 border-radius | 5.73 (= 10rpx) |
| dev-tools 圆钮 | 40 × 40 |
| dev-tools icon font-size | 22 |

注：以上数值已经是 14PM 视口下的真实渲染 px（main 分支 k 系数 ×
basal）。feature 端在源码里直接以这些 px 写，由 postcss-pxtorem
转 rem，运行时按 design_flexible 的 root font-size 还原即可。

## 截图

存档（一次性，不入库）：
- `/tmp/main-14pm-idle.png` — TOUCH TO DIVINE 待命态
- `/tmp/main-14pm-during.png` — 抽牌中
- `/tmp/main-14pm-answer.png` — 结果牌展示态
