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
 * Answer-scene bottom band reservation: the inline answer card + the
 * ActionArea sit below the result card as flex siblings in the terminal
 * `answer` flow. The reservation tracks the answer card's min-height
 * (`--answer-zone-min-height`) — the worst case that's actually
 * compositable into the stage budget. If extraordinary content pushes
 * the answer card past min-height, the flex layout shrinks the stage
 * further at runtime; the solver's pre-reveal sizing stays conservative.
 */
export function answerStageReservation(
  _viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
): number {
  return sizes.answerZoneMinHeight + sizes.actionAreaHeight
}

/**
 * Result-card sizing primitive — card width / height both equal
 * `RESULT_CARD_FILL_RATIO` of the stage rect on the matching axis.
 * No absolute px cap: the card is fully driven by the stage, which
 * itself already subtracts the answer-zone + action-area reservation,
 * so shrinking either reservation grows the card and vice versa.
 */
function fitResultCard(stage: StageRect): { width: number; height: number } {
  return {
    width: stage.width * RESULT_CARD_FILL_RATIO,
    height: stage.height * RESULT_CARD_FILL_RATIO,
  }
}

/**
 * Solve the answer-stage layout — single result card centred in the
 * stage rect that already excludes the answer-card + action-area
 * reservation. The card has a single target size (`cardWidth` /
 * `cardHeight`); the reveal pipeline grows the card directly to this
 * size, no separate "Full → shrunk" stage exists anymore because the
 * answer card has a CSS `min-height` (`--answer-zone-min-height`) and
 * mounts as a flex sibling in the terminal `answer` flow.
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
