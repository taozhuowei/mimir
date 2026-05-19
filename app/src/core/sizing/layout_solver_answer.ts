/**
 * Name: core/sizing/layout_solver_answer
 * Purpose: pure reading-stage layout solver — bottom-band reservation,
 *          result-card sizing (shrunk + full), and the assembled reading
 *          SceneLayout (single centred card + drawer anchored to its edge).
 * Reason: split out of layout_solver.ts so the answer-scene assembly is a
 *          single concern, separate from the draw-scene solver and the
 *          dispatch facade. Consumed only by `layout_solver.solveLayout`.
 * Purity: pure functions. No window access, no DOM, no global state.
 */

import {
  CARD_ASPECT_RATIO,
  MAX_CARD_WIDTH_PX,
  RESULT_CARD_FILL_RATIO,
  type PhysicalViewport,
  type ResponsiveSizes,
} from './scale'
import {
  INITIAL_DRAWER_HEIGHT_RATIO,
  computeDrawer,
  computeEnvelope,
} from './layout_solver_computers'
import type {
  CardLayout,
  SceneLayout,
  StageRect,
} from './layout_solver_types'

/**
 * Reading scene's bottom band reservation: the bottom drawer covers the
 * lower 40 % of the viewport on first reveal and the ActionArea (decision-
 * phase CTAs) sits below it in the same band. Sum them so the reading
 * stage rect shrinks by the correct amount and the result card auto-fits
 * the remaining visible area instead of landing under the drawer.
 */
export function answerStageReservation(
  viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
): number {
  return (
    Math.round(viewport.height * INITIAL_DRAWER_HEIGHT_RATIO) +
    sizes.actionAreaHeight
  )
}

/**
 * Result-card sizing primitive — given a stage rect, return the card
 * `(width, height)` that occupies `RESULT_CARD_FILL_RATIO` of the rect
 * on each axis with the width capped at `MAX_CARD_WIDTH_PX`. When the
 * cap engages, height is derived from the capped width via
 * `CARD_ASPECT_RATIO` so the 1:1.6 proportion is preserved on the
 * largest supported canvases.
 *
 * Used by both the "full" and "shrunk" reading-stage card derivations:
 *  - full  → stage rect computed without drawer reservation (safe area
 *            ≈ 80–90 % of viewport on a typical phone, so the resulting
 *            card width hits the 240 px cap on every supported viewport).
 *  - shrunk → stage rect with the drawer reservation already subtracted
 *             (the original sizing used while the bottom drawer is open).
 */
function fitResultCard(stage: StageRect): { width: number; height: number } {
  const unclampedW = stage.width * RESULT_CARD_FILL_RATIO
  const width = Math.min(unclampedW, MAX_CARD_WIDTH_PX)
  const height =
    width === unclampedW
      ? stage.height * RESULT_CARD_FILL_RATIO
      : width * CARD_ASPECT_RATIO
  return { width, height }
}

/**
 * Solve the reading-stage layout — single result card centred in the
 * shrunk stage with the bottom drawer anchored to the card's bottom edge.
 *
 * Two card sizes are emitted:
 *   1. shrunk (`cardWidth` / `cardHeight`) — fitted to the drawer-reserved
 *      stage rect. This is what the user sees once the drawer mounts
 *      (drawer covers the lower band, card sits in the remaining space).
 *      Drawer geometry is anchored to *this* size's card bottom so the
 *      drawer hugs the card after the user-visible shrink animation.
 *   2. full (`cardWidthFull` / `cardHeightFull`) — fitted to the full
 *      safe-area stage rect (no drawer reservation). The reveal pipeline
 *      grows the card to this size first; the parent then animates it
 *      down to the shrunk size when the drawer mounts.
 *
 * On every supported phone canvas (375–440 px) both sizes hit the 240 px
 * width cap because the unclamped width (≈90 % of stage width) exceeds
 * 240 px in both rectangles. The visual difference is in the height: the
 * full rect's stage is taller, so the full card is taller too (and the
 * shrunk card sits above the drawer instead of being clipped by it).
 */
export function solveAnswerStageLayout(
  viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
  stageShrunk: StageRect,
  stageFull: StageRect,
  draw: { width: number; height: number },
): SceneLayout {
  const shrunk = fitResultCard(stageShrunk)
  const full = fitResultCard(stageFull)

  const drawer = computeDrawer(viewport, stageShrunk, shrunk.height)
  const envelope = computeEnvelope(draw.width, draw.height, sizes.gap)
  const cards: CardLayout[] = [
    {
      slotId: 'center',
      x: 0,
      y: 0,
      width: shrunk.width,
      height: shrunk.height,
      rotateDeg: 0,
      zIndex: 1,
    },
  ]
  return {
    cards,
    cardWidth: shrunk.width,
    cardHeight: shrunk.height,
    cardWidthFull: full.width,
    cardHeightFull: full.height,
    drawCardWidth: draw.width,
    drawCardHeight: draw.height,
    stageShiftY: 0,
    stage: stageShrunk,
    drawer,
    envelope,
  }
}
