/**
 * Name: use_overlay_layout
 * Purpose: thin Vue composable that adapts platform window info to the pure
 *          `solveLayout` solver and exposes scene + motion + deck metrics to
 *          the controllers and components.
 * Reason: the previous implementation accumulated semantic 0.x ratios and
 *          delegated to several scattered modules (overlay_layout/*,
 *          core/layout/scene_layout, core/viewport/*). This file now owns a
 *          single integration path: window info -> PhysicalViewport ->
 *          solveLayout -> SceneLayout, plus pure motion math.
 * Data flow: window info + spread metadata flow in; SceneLayout, motion
 *          metrics, and deck centre flow out.
 */

import type { Ref } from 'vue'
import {
  solveLayout,
  type SceneLayout as SolverSceneLayout,
  type LayoutEnvelope,
} from '../core/sizing/layout_solver'
import {
  deriveSizes,
  pickCanvasWidth,
  readViewport,
  MAX_CANVAS_WIDTH,
  type PhysicalViewport,
  type ResponsiveSizes,
} from '../core/sizing/scale'
import { clamp } from '../utils/math'
import { SHUFFLE_EDGE_MARGIN } from '../core/config/layout_constants'

/**
 * Side-column drawer width (px) used by the wide-screen reading layout.
 * The wide split is rendered by ReadingSplitView at the view layer and is
 * not visible to the solver — the constant lives here so `getViewportMetrics`
 * can still expose `stageWidth = viewport.width − sideDrawerWidth` for the
 * legacy callers until that UI is removed in a later step.
 */
const WIDE_SIDE_DRAWER_WIDTH_PX = 480

/**
 * PC-mode breakpoint (px). Below this the bottom-sheet drawer wins; at or
 * above it the side-column reading layout wins. Equal to the canvas cap
 * (440) plus the side-column drawer width (480). Stays here for the same
 * reason as `WIDE_SIDE_DRAWER_WIDTH_PX` — the wide-split UI cleanup is
 * deferred to a later step.
 */
const PC_BREAKPOINT = MAX_CANVAS_WIDTH + WIDE_SIDE_DRAWER_WIDTH_PX // 920

export interface UseOverlayLayoutDeps {
  isWide: Ref<boolean>
  /** Retained in the API for source compatibility — current layout always
   *  resolves a single centred slot (single_card spread). */
  spreadKind: string
  cutPileCount: number
  deckCount: number
}

/** Scene = phase grouping the solver understands. */
type Scene = 'draw_stage' | 'reading_stage'

/**
 * Viewport metrics that include both the new physical viewport and the
 * legacy `stageWidth/stageHeight/stageContainerHeight/topBarHeight` keys
 * still consumed by the animation controller and overlay components.
 */
export interface ViewportMetrics {
  width: number
  height: number
  safeAreaTop: number
  safeAreaBottom: number
  dpr: number
  stageWidth: number
  stageHeight: number
  stageContainerHeight: number
  topBarHeight: number
}

/**
 * Scene layout consumed by templates and animation phases. Extends the pure
 * `SolverSceneLayout` with three legacy `safe*Inset` fields that the
 * `DivinationOverlay` debug overlay still reads.
 */
export interface SceneLayout extends SolverSceneLayout {
  /** Distance from viewport top to the top of the stage usable area (px). */
  safeTopInset: number
  /** Distance from viewport bottom edge to the stage usable area bottom (px). */
  safeBottomInset: number
  /** Distance from viewport left/right edges to the usable card area (px). */
  safeSideInset: number
}

/** Cut motion axis — horizontal on wide screens, vertical on narrow. */
type CutAxis = 'horizontal' | 'vertical'

/** Motion metrics consumed by shuffle / cut / draw phase runners. */
export interface MotionMetrics {
  envelope: LayoutEnvelope
  cardWidth: number
  cardHeight: number
  gap: number
  safeHalfWidth: number
  safeHalfHeight: number
  shuffleSpreadX: number
  cutPileSpacing: number
  cutAxis: CutAxis
  cardsPerPile: number
  cutLeadingOffset: { x: number; y: number }
  cutTrailingOffset: { x: number; y: number }
}

/**
 * Read the mini-program capsule rect when running in WeChat MP. Returns
 * `null` on H5 so the caller can treat the absence of a capsule uniformly.
 */
function getMenuButtonRect(): { top: number; height: number } | null {
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
function resolveTopBarHeight(rect: { top: number; height: number } | null): number {
  if (!rect) return 0
  return rect.top + rect.height + 8
}

export function useOverlayLayout(deps: UseOverlayLayoutDeps) {
  /**
   * Resolve the proportional sizes for a physical viewport. The
   * sizes are derived from the canvas width (already clamped to
   * [375, 440] by `buildPhysicalViewport`), so passing the viewport here
   * is equivalent to passing the canvas width directly.
   */
  function getSizes(viewport: PhysicalViewport): ResponsiveSizes {
    return deriveSizes(viewport.width)
  }

  /**
   * Build the physical viewport the solver works in.
   *
   * Two stages:
   *   1. `readViewport()` adapts the platform window-info into our shape
   *      (real, unclamped width + height + safe areas).
   *   2. `pickCanvasWidth()` clamps the width into the supported envelope
   *      [375, 440] so the layout is always sized as if the screen were a
   *      phone; the actual extra space on tablets / desktops is filled by
   *      background and centering at the CSS layer.
   *
   * `showResults` does NOT affect the underlying viewport — it influences
   * the stage rectangle the solver derives, so we keep the conversion
   * shape-stable here and pass `scene` to the solver further down.
   *
   * Note: the platform `topBarHeight` (mini-program capsule) is no longer
   * carried inside the viewport — the proportional `sizes.headerHeight`
   * absorbs the chrome reservation. We still read the capsule rect during
   * resize handling because future work may surface it as a separate inset.
   */
  function buildPhysicalViewport(): PhysicalViewport {
    void resolveTopBarHeight(getMenuButtonRect()) // preserved side-effect call
    const win = uni.getWindowInfo()
    const raw = readViewport({
      windowWidth: win.windowWidth,
      windowHeight: win.windowHeight,
      safeAreaInsets: win.safeAreaInsets,
    })
    return { ...raw, width: pickCanvasWidth(raw.width) }
  }

  /**
   * Public viewport metrics — combines the physical viewport with the legacy
   * `stageWidth/stageHeight/stageContainerHeight/topBarHeight` keys that
   * downstream consumers (animation controller, overlay components) still
   * use today.
   */
  function getViewportMetrics(showResults: boolean): ViewportMetrics {
    const viewport = buildPhysicalViewport()
    // Wide-screen branch retained for the legacy ReadingSplitView pipeline.
    // The solver itself no longer branches on isWide; this metric is used
    // only by the legacy stageWidth/stageHeight consumers and will be
    // dropped when the wide-split UI is cleaned up in a later step.
    const isWide = deps.isWide.value

    const stageWidth =
      showResults && isWide ? viewport.width - WIDE_SIDE_DRAWER_WIDTH_PX : viewport.width
    const stageHeight = viewport.height
    const stageContainerHeight = showResults ? stageHeight : viewport.height

    return {
      width: viewport.width,
      height: viewport.height,
      safeAreaTop: viewport.safeAreaTop,
      safeAreaBottom: viewport.safeAreaBottom,
      dpr: 1,
      stageWidth,
      stageHeight,
      stageContainerHeight,
      topBarHeight: 0,
    }
  }

  /**
   * Resolve the scene layout for `draw_stage` or `reading_stage` by
   * delegating to the pure solver, then attach the legacy `safe*Inset`
   * compatibility fields the overlay debug rectangle expects.
   */
  function getSceneLayout(scene: Scene): SceneLayout {
    const viewport = buildPhysicalViewport()
    const sizes = getSizes(viewport)

    const solved = solveLayout({ viewport, sizes, scene })

    const safeTopInset = viewport.safeAreaTop + sizes.margin + sizes.headerHeight
    const safeBottomInset = sizes.actionAreaHeight + viewport.safeAreaBottom
    const safeSideInset = sizes.margin

    return {
      ...solved,
      safeTopInset,
      safeBottomInset,
      safeSideInset,
    }
  }

  /**
   * Resolve all motion metrics (shuffle spread, cut spacing, motion bounds)
   * for the requested scene. Pure derivation from the solver's envelope.
   */
  function getMotionMetrics(scene: Scene = 'draw_stage'): MotionMetrics {
    const viewport = buildPhysicalViewport()
    const sizes = getSizes(viewport)
    const layout = solveLayout({ viewport, sizes, scene })

    const cardWidth = layout.envelope.cardWidth
    const cardHeight = layout.envelope.cardHeight
    const gap = layout.envelope.gap
    const slotPitchX = layout.envelope.slotPitchX

    // Available height matches the solver's stage budget so shuffle/cut
    // motion never escapes the safe frame. Mirror the formula in
    // `computeStage` so the two stay aligned.
    const availableH =
      viewport.height -
      viewport.safeAreaTop -
      viewport.safeAreaBottom -
      2 * sizes.margin -
      sizes.headerHeight

    const safeHalfWidth = layout.stage.width / 2
    const safeHalfHeight = availableH / 2

    // Shuffle spread: target one card width + gap, clamped between
    // `slotPitchX/2` (always visible) and `safeHalfWidth - cardWidth/2 -
    // SHUFFLE_EDGE_MARGIN` (never crosses the safe frame edge).
    const minShuffleSpread = slotPitchX / 2
    const maxShuffleSpread = Math.max(
      minShuffleSpread,
      safeHalfWidth - cardWidth / 2 - SHUFFLE_EDGE_MARGIN,
    )
    const shuffleSpreadX = clamp(cardWidth + gap, minShuffleSpread, maxShuffleSpread)

    // Cut: piles align horizontally on wide screens (one row), vertically on
    // narrow (one column). Spacing must be card dimension + gap to avoid
    // overlap when piles share the same axis.
    const cutAxis: CutAxis = deps.isWide.value ? 'horizontal' : 'vertical'
    const cutPileSpacing = (cutAxis === 'horizontal' ? cardWidth : cardHeight) + gap

    const pilesAlongAxis = Math.max(1, deps.cutPileCount)
    const halfRange = ((pilesAlongAxis - 1) / 2) * cutPileSpacing
    const cutLeadingOffset =
      cutAxis === 'horizontal' ? { x: -halfRange, y: 0 } : { x: 0, y: -halfRange }
    const cutTrailingOffset =
      cutAxis === 'horizontal' ? { x: halfRange, y: 0 } : { x: 0, y: halfRange }

    const cardsPerPile = Math.max(
      1,
      Math.floor(Math.max(1, deps.deckCount) / pilesAlongAxis),
    )

    return {
      envelope: layout.envelope,
      cardWidth,
      cardHeight,
      gap,
      safeHalfWidth,
      safeHalfHeight,
      shuffleSpreadX,
      cutPileSpacing,
      cutAxis,
      cardsPerPile,
      cutLeadingOffset,
      cutTrailingOffset,
    }
  }

  /**
   * Convenience accessor returning all three layouts the controller needs at
   * once. Resolved from a single window snapshot so the three results are
   * mutually consistent.
   */
  function getOverlayLayouts(): {
    drawViewport: ViewportMetrics
    drawLayout: SceneLayout
    resultLayout: SceneLayout
  } {
    const drawViewport = getViewportMetrics(false)
    const drawLayout = getSceneLayout('draw_stage')
    const resultLayout = getSceneLayout('reading_stage')
    return { drawViewport, drawLayout, resultLayout }
  }

  /**
   * Update `deps.isWide` when the window size crosses the PC breakpoint.
   * Returns true iff `isWide` actually changed so the caller can short-
   * circuit redundant relayouts.
   *
   * The threshold is `PC_BREAKPOINT` (920 = phone-stage 440 + side drawer
   * 480), the smallest viewport on which the side-column reading layout
   * fits next to the phone-sized stage. Below 920 we render the bottom-
   * sheet drawer; above we render the side column.
   */
  function checkWidth(windowWidth: number): boolean {
    const wasWide = deps.isWide.value
    deps.isWide.value = windowWidth >= PC_BREAKPOINT
    return wasWide !== deps.isWide.value
  }

  /**
   * Centre point the deck animates around at rest.
   * Stage-relative coordinates (origin = stage centre): x is always 0
   * because the deck stays horizontally centred; y matches the central
   * slot's y so the deck visually sits where the drawn cards will land.
   */
  function getDeckCenter(): { centerX: number; centerY: number } {
    const drawLayout = getSceneLayout('draw_stage')
    const centerSlot = drawLayout.cards[0]
    return {
      centerX: 0,
      centerY: centerSlot ? centerSlot.y : 0,
    }
  }

  return {
    getViewportMetrics,
    getSceneLayout,
    getMotionMetrics,
    getOverlayLayouts,
    checkWidth,
    getDeckCenter,
  }
}
