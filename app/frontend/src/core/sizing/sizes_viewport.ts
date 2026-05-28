/**
 * Name: core/sizing/sizes_viewport
 * Purpose: pixel-valued sizes derived from the canvas width via `k`,
 *          plus the platform-window-info adapter (`readViewport`) that
 *          turns `uni.getWindowInfo()` shaped data into a `PhysicalViewport`.
 * Reason: the previous `scale.ts` mixed five concerns into a single 473-line
 *          file. Splitting the sizes derivation + viewport adapter out gives
 *          the layout solver a small, pure, dependency it can rely on
 *          without dragging in the Vue composable or rAF shims.
 * Data flow: canvasWidth ──▶ deriveSizes ──▶ ResponsiveSizes;
 *            uni.getWindowInfo()-shaped data ──▶ readViewport ──▶
 *            PhysicalViewport (caller pipes width through pickCanvasWidth
 *            for the layout solver path).
 *
 * Purity: every export here is a pure value or pure function. No Vue, no
 *         uni APIs, no DOM. Trivially testable.
 */

import {
  ANSWER_ZONE_MIN_HEIGHT,
  BASELINE_ACTION_AREA_HEIGHT,
  BASELINE_DRAWER_MIN_HEIGHT,
  BASELINE_FONT_L,
  BASELINE_FONT_M,
  BASELINE_FONT_S,
  BASELINE_FONT_XL,
  BASELINE_FONT_XS,
  BASELINE_FONT_XXL,
  BASELINE_FONT_XXS,
  BASELINE_GAP,
  BASELINE_HEADER_HEIGHT,
  BASELINE_MARGIN,
  CONTAINER_GAP,
  deriveFontScale,
  deriveScale,
} from './scale_constants'

// ---------------------------------------------------------------------------
// Sizes interface — the single source of truth for derived px values.
// ---------------------------------------------------------------------------

/**
 * 派生后的像素尺寸；每个 px 字段四舍五入为整数避免亚像素布局。
 * 布局类字段（header / margin / gap / drawer / action / answerZone）走
 * `k = deriveScale`（iP8 锚 × w/375）；字号类字段（font*）走
 * `fontK = deriveFontScale`（14PM 锚 × clamp(0.8721, w/430, 1)），与
 * `design_flexible` 同源。`containerGap` 是固定 CSS 像素，不缩放。
 */
export interface ResponsiveSizes {
  /** 逻辑画布宽（clamp 到 [375, 440]）。 */
  canvasWidth: number
  /** 布局缩放因子（iP8 锚）。 */
  k: number
  /** 字号缩放因子（14PM 锚）。 */
  fontK: number
  /** 头部容器高（baseline 80 × k）。 */
  headerHeight: number
  /** 画布外边距（baseline 16 × k）。 */
  margin: number
  /** 卡牌间 gap（baseline 12 × k）。 */
  gap: number
  /** 主面板容器间距，固定 CSS px，不缩放。 */
  containerGap: number
  /** drawer 初始高（baseline 120 × k）。 */
  drawerMinHeight: number
  /** 操作区高（baseline 96 × k）。 */
  actionAreaHeight: number
  /** 答案卡 min-height（14PM 真值 160 反推到 iP8）× k。 */
  answerZoneMinHeight: number
  /** 大标题字号（14PM 真值 32 × fontK）。 */
  fontXXL: number
  /** 标题字号（14PM 真值 24 × fontK）。 */
  fontXL: number
  /** 副标题字号（14PM 真值 22 × fontK）。 */
  fontL: number
  /** 正文字号（14PM 真值 16 × fontK）。 */
  fontM: number
  /** 辅助字号（14PM 真值 14 × fontK）。 */
  fontS: number
  /** 小注字号（14PM 真值 12 × fontK）。 */
  fontXS: number
  /** 极小字号（14PM 真值 10 × fontK）。 */
  fontXXS: number
}

/** 纯派生：从画布宽算出全部像素 token。 */
export function deriveSizes(canvasWidth: number): ResponsiveSizes {
  const k = deriveScale(canvasWidth)
  const fontK = deriveFontScale(canvasWidth)
  return {
    canvasWidth,
    k,
    fontK,
    headerHeight: Math.round(BASELINE_HEADER_HEIGHT * k),
    margin: Math.round(BASELINE_MARGIN * k),
    gap: Math.round(BASELINE_GAP * k),
    containerGap: CONTAINER_GAP,
    drawerMinHeight: Math.round(BASELINE_DRAWER_MIN_HEIGHT * k),
    actionAreaHeight: Math.round(BASELINE_ACTION_AREA_HEIGHT * k),
    answerZoneMinHeight: Math.round(ANSWER_ZONE_MIN_HEIGHT * k),
    fontXXL: Math.round(BASELINE_FONT_XXL * fontK),
    fontXL: Math.round(BASELINE_FONT_XL * fontK),
    fontL: Math.round(BASELINE_FONT_L * fontK),
    fontM: Math.round(BASELINE_FONT_M * fontK),
    fontS: Math.round(BASELINE_FONT_S * fontK),
    fontXS: Math.round(BASELINE_FONT_XS * fontK),
    fontXXS: Math.round(BASELINE_FONT_XXS * fontK),
  }
}

// ---------------------------------------------------------------------------
// Viewport adapter — pure conversion from platform window info to a
// PhysicalViewport. The layout solver consumes this shape directly, so the
// adapter lives alongside the sizes it ultimately drives. Width is left
// unclamped so callers can either feed the raw viewport into `pickScreenMode`-
// style branches or pipe it through `pickCanvasWidth` to get the canvas
// value the solver actually uses.
// ---------------------------------------------------------------------------

/**
 * Physical viewport metrics in CSS pixels. The `width` field is the caller's
 * responsibility — typically the result of `pickCanvasWidth(realWidth)` when
 * fed into the layout solver, or the raw viewport width when used for
 * screen-mode classification.
 */
export interface PhysicalViewport {
  /** Logical canvas width (caller's responsibility — typically pickCanvasWidth(real)). */
  width: number
  /** Real viewport height in px. Not clamped. */
  height: number
  /** Top safe-area inset (status bar / notch) in px. */
  safeAreaTop: number
  /** Bottom safe-area inset in px. */
  safeAreaBottom: number
}

/**
 * Shape of the platform-supplied window info we accept. Kept structurally
 * typed so callers can pass `uni.getWindowInfo()` results directly without
 * an explicit conversion.
 */
export interface WindowInfoShape {
  windowWidth: number
  windowHeight: number
  safeAreaInsets?: { top?: number; bottom?: number; left?: number; right?: number }
}

/**
 * Adapter: convert platform window info into a PhysicalViewport.
 *
 * Pure / no side effects. Does NOT clamp the width — pipe through
 * `pickCanvasWidth` at the call site if you want the canvas value the
 * layout solver should use. Negative or fractional inputs are coerced to
 * non-negative integers so downstream math sees stable values.
 */
export function readViewport(info: WindowInfoShape): PhysicalViewport {
  // Single source of zero-defaults: if `safeAreaInsets` is missing entirely
  // (older runtimes / mini-program edge cases) substitute a fully-populated
  // object so each field read below sees a real number, no per-field `?? 0`.
  const insets = info.safeAreaInsets ?? { top: 0, bottom: 0 }
  return {
    width: Math.max(0, Math.floor(info.windowWidth)),
    height: Math.max(0, Math.floor(info.windowHeight)),
    safeAreaTop: Math.max(0, Math.floor(insets.top ?? 0)),
    safeAreaBottom: Math.max(0, Math.floor(insets.bottom ?? 0)),
  }
}
