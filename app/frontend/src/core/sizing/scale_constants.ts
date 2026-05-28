/**
 * Name: core/sizing/scale_constants
 * Purpose: baseline 像素常量 + 视口 clamp（`pickCanvasWidth`）+ 两套缩放
 *          因子函数：`deriveScale`（iP8 锚 + 上放，用于布局/间距类
 *          token）与 `deriveFontScale`（14PM 锚 + 下缩，与
 *          `design_flexible` 同源，用于字号 token）。
 * Data flow: viewport width ──▶ pickCanvasWidth ──▶ deriveScale | deriveFontScale.
 *
 * Purity: 所有导出均为纯值 / 纯函数。
 */

// ---------------------------------------------------------------------------
// 常量分两族：
//   1. 布局类 baseline（header / margin / gap / answer-zone / action）：
//      iP8 (375 px) 真值，运行时 × `deriveScale(canvasWidth) = w / 375`。
//   2. 字号类 baseline（FONT_*）：iPhone 14 Pro Max (430 px) 设计稿真值，
//      运行时 × `deriveFontScale(canvasWidth) = clamp(0.8721, w/430, 1)`，
//      与 `design_flexible` 的 rem 缩放公式同源，避免与 PostCSS pxtorem
//      转换链叠加。视口 < 375 时锁定 iP8 真宽，画布溢出由 too-small
//      横幅 + body 滚动兜底。
// ---------------------------------------------------------------------------

/** Smallest logical canvas width the scale system uses (iPhone 8). */
export const MIN_CANVAS_WIDTH = 375
/** Largest logical canvas width the scale system uses (iPhone 17 Pro Max). */
export const MAX_CANVAS_WIDTH = 440
/**
 * Reference design canvas width — iPhone 14 Pro Max (430 logical px).
 * Design specs land at this canvas; constants pinned to a real-world target
 * size on this device are back-scaled to the iPhone 8 baseline via
 * `MIN_CANVAS_WIDTH / REF_DESIGN_CANVAS_WIDTH`, so the source value the
 * designer wrote stays first-class in code.
 */
export const REF_DESIGN_CANVAS_WIDTH = 430

/** 头部容器高度 iP8 baseline (px)。 */
export const BASELINE_HEADER_HEIGHT = 80
/** 画布外边距 iP8 baseline (px)。 */
export const BASELINE_MARGIN = 16
/** 卡牌间 gap iP8 baseline (px)。 */
export const BASELINE_GAP = 12
/** drawer 初始高 iP8 baseline (px)。 */
export const BASELINE_DRAWER_MIN_HEIGHT = 120
/** 底部操作区高度 iP8 baseline (px)。 */
export const BASELINE_ACTION_AREA_HEIGHT = 96
/**
 * 答案卡 min-height iP8 baseline (px)：14PM 设计真值 160 反推到 iP8。
 * 同时作为布局求解器 stage 下方的预留预算（worst case）。
 */
export const ANSWER_ZONE_MIN_HEIGHT =
  Math.round(160 * MIN_CANVAS_WIDTH / REF_DESIGN_CANVAS_WIDTH)
/**
 * 主面板四段容器间距（标题 / 舞台 / 答案卡 / 操作区之间），固定
 * CSS 像素值，不随视口缩放。同时由 `:root --container-gap` 静态镜像
 * 提供，组件统一引用变量。布局求解器答案场景下扣 2 段、非答案场景
 * 下扣 1 段，使求解高度与渲染高度同源。
 */
export const CONTAINER_GAP = 10
// ---------------------------------------------------------------------------
// 字号 baseline = iPhone 14 Pro Max (430 px) 设计稿真值。
// 运行时 × `deriveFontScale(canvasWidth) = clamp(0.8721, w/430, 1)`：
//   14PM 输出 = baseline × 1（设计真值原样）
//   iP8  输出 = baseline × 0.8721
//   17 Air (~402px) 输出 ≈ baseline × 0.935
// ---------------------------------------------------------------------------
/** 大标题字号 14PM 真值 (px)。 */
export const BASELINE_FONT_XXL = 32
/** 标题字号 14PM 真值 (px)。 */
export const BASELINE_FONT_XL = 24
/** 副标题字号 14PM 真值 (px)。 */
export const BASELINE_FONT_L = 22
/** 正文字号 14PM 真值 (px)。 */
export const BASELINE_FONT_M = 16
/** 辅助字号 14PM 真值 (px)。 */
export const BASELINE_FONT_S = 14
/** 小注字号 14PM 真值 (px)。 */
export const BASELINE_FONT_XS = 12
/** 极小字号 14PM 真值 (px) —— 用于来源 / 角注。 */
export const BASELINE_FONT_XXS = 10

/** Card visual aspect ratio (height / width) — tarot cards are tall. */
export const CARD_ASPECT_RATIO = 1.6

/**
 * Result card occupies this fraction of the stage rect (each axis).
 * The stage already excludes the answer-card + action-area reservation
 * on the answer scene, so the card grows / shrinks with that
 * reservation 1:1; no absolute px cap is applied. Shrinking the answer
 * card's min-height grows the stage, which grows the result card.
 */
export const RESULT_CARD_FILL_RATIO = 0.9

// ---------------------------------------------------------------------------
// Pure functions — no Vue, no uni, no DOM. Trivially testable.
// ---------------------------------------------------------------------------

/**
 * Pick the logical canvas width for a real viewport width.
 *
 *   width <  375 → 375  (layout will overflow; we don't fit smaller devices)
 *   375 ≤ w ≤ 440 → rounded to integer (fractional viewports are coerced)
 *   width >  440 → 440  (any extra horizontal space becomes background)
 *
 * Non-finite inputs (NaN, -Infinity) collapse to MIN_CANVAS_WIDTH; +Infinity
 * collapses to MAX_CANVAS_WIDTH. The result is always an integer in
 * `[MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH]`, so downstream `deriveSizes`
 * receives a stable, integer canvas width regardless of caller.
 *
 * Pure function: same input always produces the same output.
 */
export function pickCanvasWidth(viewportWidth: number): number {
  // Order matters: clamp *up* (NaN, -Infinity, < MIN) before clamping *down*.
  // NaN compared with any operator is false, so the NaN branch must be the
  // explicit `Number.isNaN` check below — it cannot rely on `< MIN_CANVAS_WIDTH`.
  if (Number.isNaN(viewportWidth) || viewportWidth < MIN_CANVAS_WIDTH) {
    return MIN_CANVAS_WIDTH
  }
  if (viewportWidth > MAX_CANVAS_WIDTH) {
    return MAX_CANVAS_WIDTH
  }
  return Math.round(viewportWidth)
}

/**
 * 布局缩放因子 `k = canvasWidth / 375`（iP8 锚，向上放）。用于
 * header / margin / answer-zone / action / drawer 等布局 token。
 * 支持区间 [1.0, 440/375 ≈ 1.1733]。
 */
export function deriveScale(canvasWidth: number): number {
  return canvasWidth / MIN_CANVAS_WIDTH
}

/**
 * 字号缩放因子 `clamp(0.8721, w/430, 1)`（14PM 锚，向下缩）。与
 * `design_flexible` 的 rem 链 / PostCSS pxtorem 同源，避免叠加。
 * 字号 token 一律走这条公式。
 */
export function deriveFontScale(canvasWidth: number): number {
  const ratio = canvasWidth / REF_DESIGN_CANVAS_WIDTH
  if (ratio >= 1) return 1
  const floor = MIN_CANVAS_WIDTH / REF_DESIGN_CANVAS_WIDTH
  if (ratio <= floor) return floor
  return ratio
}
