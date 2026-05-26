/**
 * Name: core/sizing/overlay_layout/wide_breakpoint_and_chrome
 * Purpose: mini-program chrome adapter — the WeChat capsule rect reader
 *          and the topBarHeight / menu-clearance resolution.
 * Reason: extracted from `use_overlay_layout.ts`. The wide-screen
 *          breakpoint constants + `checkWidth` that used to live here
 *          were removed in F5: `isWide` is now a single-writer flag set
 *          only by use_main_stage.recomputeIsWide at `> MAX_CANVAS_WIDTH`,
 *          which fixed a dual-threshold race (440 vs 920) on the same ref
 *          that left the cut-animation axis non-deterministic in the
 *          440–920 viewport band. The file keeps its name for now; a
 *          rename to drop the now-stale `wide_breakpoint` part is parked
 *          as layout-logic cleanup debt.
 * Data flow: mini-program capsule rect ──▶ resolveTopBarHeight ──▶
 *            topBarHeight / menu-clearance metric.
 */

/**
 * Read the mini-program capsule rect when running in WeChat MP. Returns
 * `null` on H5 so the caller can treat the absence of a capsule uniformly.
 */
export function getMenuButtonRect(): { top: number; height: number } | null {
  // #ifdef MP-WEIXIN
  try {
    const { top, height } = uni.getMenuButtonBoundingClientRect()
    return { top, height }
  } catch {
    return { top: 44, height: 32 }
  }
  // #endif
  return null
}

/**
 * Derive the topBarHeight (capsule + small breathing room) from the MP
 * capsule rect. H5 has no capsule, so the topBarHeight is 0.
 */
export function resolveTopBarHeight(rect: { top: number; height: number } | null): number {
  if (!rect) return 0
  return rect.top + rect.height + 8
}

/**
 * (task 8.2.5)
 * Pixel clearance the page must reserve below the MP-WeChat menu capsule
 * so headers / overlays do not collide with it.
 *
 * - mp-weixin: returns the live capsule `top + height + 8`px buffer
 *   (typically ~95 px on tall iPhones; smaller on Android).
 * - H5 / desktop: returns 0 since there is no capsule.
 *
 * Surfaced as the `--menu-clearance` CSS var via `useCssVarBridge`, so any
 * component that needs to sit below the capsule can write
 * `margin-top: max(<their-baseline>, var(--menu-clearance, 0px))` and
 * stay correct on both platforms without touching JS.
 *
 * Read once at composable subscription time — the capsule rect is stable
 * for the page lifetime, so caching at the bridge layer is acceptable.
 */
export function getMenuClearancePx(): number {
  return resolveTopBarHeight(getMenuButtonRect())
}
