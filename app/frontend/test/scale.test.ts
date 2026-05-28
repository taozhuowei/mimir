// @vitest-environment node

/**
 * Test suite for the proportional scale module.
 *
 * Coverage: only the pure exported functions —
 *   - pickCanvasWidth (clamps viewport width into [375, 440])
 *   - deriveScale     (k = canvasWidth / 375)
 *   - deriveSizes    (px sizes = baseline × k, rounded)
 *
 * `useResponsiveScale` is a Vue composable that depends on the uni
 * runtime and `requestAnimationFrame`; it is intentionally out of scope
 * for this suite (would require mocking the platform layer).
 *
 * Inputs are passed as plain literals — no DOM, no uni, no Vue.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  BASELINE_ACTION_AREA_HEIGHT,
  BASELINE_DRAWER_MIN_HEIGHT,
  BASELINE_GAP,
  BASELINE_HEADER_HEIGHT,
  BASELINE_MARGIN,
  CONTAINER_GAP,
  MAX_CANVAS_WIDTH,
  MIN_CANVAS_WIDTH,
  deriveFontScale,
  deriveScale,
  deriveSizes,
  pickCanvasWidth,
  useResponsiveScale,
} from '../src/core/sizing/scale'

/**
 * 写死 canvas=440 时各 token 期望整数。布局类按 k=440/375≈1.17333 放大；
 * 字号类按 fontScale=clamp(0.8721, 440/430, 1)=1 走 14PM 真值；containerGap
 * 固定。硬编码而非用公式拼接，是为了让 Math.round → Math.floor 的回归
 * 直接挂掉。
 */
const EXPECTED_AT_440 = {
  headerHeight: 94,
  margin: 19,
  gap: 14,
  containerGap: 10,
  drawerMinHeight: 141,
  actionAreaHeight: 113,
  fontXXL: 32,
  fontXL: 24,
  fontL: 22,
  fontM: 16,
  fontS: 14,
  fontXS: 12,
  fontXXS: 10,
} as const

/**
 * 字号在 iP8 (375) 上经 fontScale=375/430≈0.8721 缩放并 round 的期望值。
 */
const EXPECTED_FONT_AT_375 = {
  fontXXL: 28,
  fontXL: 21,
  fontL: 19,
  fontM: 14,
  fontS: 12,
  fontXS: 10,
  fontXXS: 9,
} as const

describe('scale — pickCanvasWidth', () => {
  it('clamps narrow viewports up to MIN_CANVAS_WIDTH (375)', () => {
    expect(pickCanvasWidth(0)).toBe(MIN_CANVAS_WIDTH)
    expect(pickCanvasWidth(200)).toBe(MIN_CANVAS_WIDTH)
    expect(pickCanvasWidth(374)).toBe(MIN_CANVAS_WIDTH)
  })

  it('passes through widths inside the supported range as-is', () => {
    expect(pickCanvasWidth(375)).toBe(375)
    expect(pickCanvasWidth(400)).toBe(400)
    expect(pickCanvasWidth(440)).toBe(440)
  })

  it('clamps wide viewports down to MAX_CANVAS_WIDTH (440)', () => {
    expect(pickCanvasWidth(441)).toBe(MAX_CANVAS_WIDTH)
    expect(pickCanvasWidth(768)).toBe(MAX_CANVAS_WIDTH)
    expect(pickCanvasWidth(1440)).toBe(MAX_CANVAS_WIDTH)
    expect(pickCanvasWidth(9999)).toBe(MAX_CANVAS_WIDTH)
  })

  it('handles non-finite inputs by collapsing to the appropriate bound', () => {
    // NaN and -Infinity are "less than MIN" in the implementation's eyes.
    expect(pickCanvasWidth(NaN)).toBe(375)
    expect(pickCanvasWidth(-Infinity)).toBe(375)
    // +Infinity is greater than MAX → clamps down to 440.
    expect(pickCanvasWidth(Infinity)).toBe(440)
  })

  it('rounds fractional inputs inside the supported range to integers', () => {
    // Contract: fractional viewports are coerced to the nearest integer
    // canvas width so downstream `deriveSizes` always sees an integer.
    expect(pickCanvasWidth(390.6)).toBe(391)
    expect(pickCanvasWidth(390.4)).toBe(390)
  })
})

describe('scale — deriveScale', () => {
  it('returns exactly 1.0 at the baseline canvas (375)', () => {
    expect(deriveScale(375)).toBe(1)
  })

  it('returns 440/375 at the maximum canvas (440)', () => {
    expect(deriveScale(440)).toBeCloseTo(440 / 375, 10)
  })

  it('is linear at intermediate canvas widths', () => {
    expect(deriveScale(400)).toBeCloseTo(400 / 375, 10)
  })
})

describe('scale — deriveFontScale (14PM-anchored, design_flexible-aligned)', () => {
  it('returns exactly 1 at the reference canvas (430)', () => {
    expect(deriveFontScale(430)).toBe(1)
  })

  it('clamps above the reference (canvas > 430 → 1)', () => {
    expect(deriveFontScale(440)).toBe(1)
  })

  it('clamps below the floor (canvas < 375 → 375/430)', () => {
    expect(deriveFontScale(375)).toBeCloseTo(375 / 430, 10)
    expect(deriveFontScale(0)).toBeCloseTo(375 / 430, 10)
  })

  it('is linear between the floor and the reference', () => {
    expect(deriveFontScale(402)).toBeCloseTo(402 / 430, 10)
  })
})

describe('scale — deriveSizes at iPhone 8 baseline (375)', () => {
  it('layout tokens equal iP8 baseline (k=1); font tokens scaled by 14PM-anchored fontScale', () => {
    const t = deriveSizes(375)
    expect(t.canvasWidth).toBe(375)
    expect(t.k).toBe(1)
    expect(t.fontK).toBeCloseTo(375 / 430, 10)
    expect(t.headerHeight).toBe(BASELINE_HEADER_HEIGHT)
    expect(t.margin).toBe(BASELINE_MARGIN)
    expect(t.gap).toBe(BASELINE_GAP)
    expect(t.containerGap).toBe(CONTAINER_GAP)
    expect(t.drawerMinHeight).toBe(BASELINE_DRAWER_MIN_HEIGHT)
    expect(t.actionAreaHeight).toBe(BASELINE_ACTION_AREA_HEIGHT)
    // 字号锚 14PM 真值 + fontScale=375/430，硬编码 round 结果防回归。
    expect(t.fontXXL).toBe(EXPECTED_FONT_AT_375.fontXXL) // 28
    expect(t.fontXL).toBe(EXPECTED_FONT_AT_375.fontXL) // 21
    expect(t.fontL).toBe(EXPECTED_FONT_AT_375.fontL) // 19
    expect(t.fontM).toBe(EXPECTED_FONT_AT_375.fontM) // 14
    expect(t.fontS).toBe(EXPECTED_FONT_AT_375.fontS) // 12
    expect(t.fontXS).toBe(EXPECTED_FONT_AT_375.fontXS) // 10
    expect(t.fontXXS).toBe(EXPECTED_FONT_AT_375.fontXXS) // 9
  })
})

describe('scale — deriveSizes at iPhone 17 Pro Max (440)', () => {
  it('layout tokens scaled by k=440/375; font tokens equal 14PM真值 (fontScale=1); containerGap fixed', () => {
    const k = 440 / 375
    const t = deriveSizes(440)
    expect(t.canvasWidth).toBe(440)
    expect(t.k).toBeCloseTo(k, 10)
    expect(t.fontK).toBe(1)

    // 硬编码整数，防止 round → floor 类回归静默通过。
    expect(t.headerHeight).toBe(EXPECTED_AT_440.headerHeight) // 94
    expect(t.margin).toBe(EXPECTED_AT_440.margin) // 19
    expect(t.gap).toBe(EXPECTED_AT_440.gap) // 14
    expect(t.containerGap).toBe(EXPECTED_AT_440.containerGap) // 10
    expect(t.drawerMinHeight).toBe(EXPECTED_AT_440.drawerMinHeight) // 141
    expect(t.actionAreaHeight).toBe(EXPECTED_AT_440.actionAreaHeight) // 113
    expect(t.fontXXL).toBe(EXPECTED_AT_440.fontXXL) // 32
    expect(t.fontXL).toBe(EXPECTED_AT_440.fontXL) // 24
    expect(t.fontL).toBe(EXPECTED_AT_440.fontL) // 22
    expect(t.fontM).toBe(EXPECTED_AT_440.fontM) // 16
    expect(t.fontS).toBe(EXPECTED_AT_440.fontS) // 14
    expect(t.fontXS).toBe(EXPECTED_AT_440.fontXS) // 12
    expect(t.fontXXS).toBe(EXPECTED_AT_440.fontXXS) // 10
  })
})

describe('scale — deriveSizes token integrity', () => {
  it('returns integer values for every px field across the supported range', () => {
    for (const canvas of [375, 390, 400, 414, 428, 440]) {
      const t = deriveSizes(canvas)
      expect(Number.isInteger(t.headerHeight)).toBe(true)
      expect(Number.isInteger(t.margin)).toBe(true)
      expect(Number.isInteger(t.gap)).toBe(true)
      expect(Number.isInteger(t.containerGap)).toBe(true)
      expect(Number.isInteger(t.drawerMinHeight)).toBe(true)
      expect(Number.isInteger(t.actionAreaHeight)).toBe(true)
      expect(Number.isInteger(t.fontXXL)).toBe(true)
      expect(Number.isInteger(t.fontXL)).toBe(true)
      expect(Number.isInteger(t.fontL)).toBe(true)
      expect(Number.isInteger(t.fontM)).toBe(true)
      expect(Number.isInteger(t.fontS)).toBe(true)
      expect(Number.isInteger(t.fontXS)).toBe(true)
      expect(Number.isInteger(t.fontXXS)).toBe(true)
    }
  })

  it('exposes `k` / `fontK` equal to derive(Font)Scale(canvasWidth)', () => {
    for (const canvas of [375, 390, 400, 414, 428, 440]) {
      const t = deriveSizes(canvas)
      expect(t.k).toBe(deriveScale(canvas))
      expect(t.fontK).toBe(deriveFontScale(canvas))
    }
  })

  it('containerGap is a fixed CSS px value, unaffected by canvas width', () => {
    for (const canvas of [375, 402, 430, 440]) {
      expect(deriveSizes(canvas).containerGap).toBe(CONTAINER_GAP)
    }
  })
})

/**
 * Singleton behaviour for `useResponsiveScale` — verifies the module-level
 * state survives across calls (so N consumers share ONE listener) and that
 * `dispose()` resets it cleanly so a future call rebuilds fresh refs.
 *
 * The test runs in node env (`@vitest-environment node` declared at the top
 * of the file), where `uni` and the rAF globals do not exist. We stub them
 * minimally in `beforeEach` so the composable's platform-touching paths
 * resolve to deterministic values. The stub is reset every test so any
 * residual singleton state from a prior test leaks at most one assertion.
 */
describe('scale — useResponsiveScale singleton', () => {
  beforeEach(() => {
    // Minimal `uni` stub — the composable touches only these three methods.
    // Pinning a 375 px viewport keeps the derived sizes deterministic and
    // matches the iPhone 8 baseline used by the other suites.
    ;(globalThis as { uni?: unknown }).uni = {
      getWindowInfo: () => ({
        windowWidth: 375,
        windowHeight: 667,
        safeAreaInsets: { top: 0, bottom: 0 },
      }),
      onWindowResize: () => { /* no-op */ },
      offWindowResize: () => { /* no-op */ },
    }
  })

  it('returns the same `sizes` / `viewport` ref objects across calls', () => {
    const a = useResponsiveScale()
    const b = useResponsiveScale()
    // Object identity: every consumer shares ONE subscription point. If
    // this regresses (e.g. someone reverts the singleton), the CSS-variable
    // bridge ends up duplicating listeners and the bridge in pages/main
    // silently drifts from the descendants' independently-subscribed refs.
    expect(a.sizes).toBe(b.sizes)
    expect(a.viewport).toBe(b.viewport)
    a.dispose()
  })

  it('rebuilds fresh refs after `dispose()` resets the singleton', () => {
    const first = useResponsiveScale()
    const sizesBeforeDispose = first.sizes
    first.dispose()

    // After disposal the module-level singleton is null again, so the next
    // call MUST construct fresh refs — the disposed ones are unreachable.
    const second = useResponsiveScale()
    expect(second.sizes).not.toBe(sizesBeforeDispose)
    second.dispose()
  })
})
