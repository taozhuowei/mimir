/**
 * Name: core/sizing/overlay_layout/wide_breakpoint_and_chrome
 * Purpose: holds the breakpoint constants and helpers used by the
 *          overlay-layout composable: the wide-screen side-drawer width,
 *          the PC-mode threshold, the mini-program menu-button rect
 *          reader, and the topBarHeight resolution.
 * Reason: extracted from `use_overlay_layout.ts` (was 361 lines) so the
 *          breakpoint math + platform chrome adapter stays small,
 *          testable, and can be re-exported via the composable facade
 *          without changing any downstream import paths.
 * Data flow: viewport width ──▶ checkWidth(deps.isWide) toggles the
 *            wide-screen flag; mini-program capsule rect ──▶
 *            resolveTopBarHeight ──▶ topBarHeight metric.
 */

import { MAX_CANVAS_WIDTH } from '../scale'

/**
 * Legacy wide-screen breakpoint addend (px). It once was the
 * wide-split side-column width; that UI and the stage-width shrink
 * it drove are gone. The value is now decoupled from any UI element —
 * it survives only as the addend that, with the canvas cap, fixes the
 * `isWide` responsive threshold at 920 (see `PC_BREAKPOINT`). The
 * `*_DRAWER_*` name is now a misnomer (no drawer); a rename is parked as
 * pivot layout-logic debt and is out of this step's scope.
 */
export const WIDE_SIDE_DRAWER_WIDTH_PX = 480

/**
 * `isWide` responsive breakpoint (px) = canvas cap (440) + the legacy
 * addend (480) = 920. Above it `isWide` flips true; today `isWide` only
 * drives the cut-animation axis (motion_metrics) — no split/drawer UI
 * branches on it anymore. NOTE: a second writer, use_main_stage's
 * recomputeIsWide, sets the same ref at a different threshold
 * (> MAX_CANVAS_WIDTH = 440); reconciling the dual threshold is parked
 * as pivot layout-logic debt — not touched here.
 */
const PC_BREAKPOINT = MAX_CANVAS_WIDTH + WIDE_SIDE_DRAWER_WIDTH_PX // 920

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

/**
 * Update an `isWide` ref when the window size crosses the PC breakpoint.
 * Returns true iff `isWide` actually changed so the caller can short-
 * circuit redundant relayouts.
 *
 * The threshold is `PC_BREAKPOINT` (920). The split/drawer UI it used to
 * gate is gone; crossing it now only flips `isWide`, which solely drives
 * the cut-animation axis. Kept as a stable breakpoint, not a UI switch.
 */
export function checkWidth(isWide: { value: boolean }, windowWidth: number): boolean {
  const wasWide = isWide.value
  isWide.value = windowWidth >= PC_BREAKPOINT
  return wasWide !== isWide.value
}
