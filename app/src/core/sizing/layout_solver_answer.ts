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
  computeDrawer,
  computeEnvelope,
} from './layout_solver_computers'
import type {
  CardLayout,
  SceneLayout,
  StageRect,
} from './layout_solver_types'

/**
 * Answer-scene bottom band reservation: the inline answer zone + the
 * ActionArea sit below the result card as flex siblings in the terminal
 * `answer` flow. Their CSS heights are locked to `--answer-zone-height`
 * and `--action-area-height` so this reservation, the DOM-occupied space,
 * and the GSAP-driven card size all agree by construction — the card no
 * longer needs to "shrink down" after reveal because reveal already
 * targets the stage rect that excludes this reservation.
 */
export function answerStageReservation(
  _viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
): number {
  return sizes.answerZoneHeight + sizes.actionAreaHeight
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
 * Solve the answer-stage layout — single result card centred in the
 * stage rect that already excludes the answer-zone + action-area
 * reservation. The card has a single target size (`cardWidth` /
 * `cardHeight`); the reveal pipeline grows the card directly to this
 * size, no separate "Full → shrunk" stage exists anymore because the
 * answer zone is locked-height (`--answer-zone-height`) and mounts as a
 * flex sibling in the terminal `answer` flow.
 */
export function solveAnswerStageLayout(
  viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
  stageShrunk: StageRect,
  draw: { width: number; height: number },
): SceneLayout {
  const shrunk = fitResultCard(stageShrunk)

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
    drawCardWidth: draw.width,
    drawCardHeight: draw.height,
    stageShiftY: 0,
    stage: stageShrunk,
    drawer,
    envelope,
  }
}
