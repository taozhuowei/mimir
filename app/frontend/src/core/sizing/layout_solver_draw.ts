/**
 * Name: core/sizing/layout_solver_draw
 * Purpose: pure draw-stage layout solver — single centred slot with the
 *          drawer anchored at the stage bottom (drawer closed during
 *          shuffle / cut / draw, but geometry still emitted for consumers
 *          that branch on it).
 * Reason: split out of layout_solver.ts so the draw-scene assembly is a
 *          single concern, separate from the answer-scene solver and the
 *          dispatch facade. Consumed only by `layout_solver.solveLayout`.
 * Purity: pure function. No window access, no DOM, no global state.
 */

import {
  computeDrawer,
  computeEnvelope,
} from './layout_solver_computers'
import type {
  CardLayout,
  SceneLayout,
  StageRect,
} from './layout_solver_types'
import type {
  PhysicalViewport,
  ResponsiveSizes,
} from './scale'

/**
 * Solve the draw-stage layout — three-pile grid where each pile is one
 * draw card and the drawer stays anchored at the stage bottom (the
 * drawer is closed during shuffle / cut / draw, but the geometry is
 * still emitted for downstream consumers that branch on it).
 */
export function solveDrawStageLayout(
  viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
  stage: StageRect,
  draw: { width: number; height: number },
): SceneLayout {
  // cardBottom collapses to `stage.y + stage.height` per the formula in
  // computeDrawer's docstring when `cardHeight === stage.height`.
  const drawer = computeDrawer(viewport, stage, stage.height)
  const envelope = computeEnvelope(draw.width, draw.height, sizes.gap)
  const cards: CardLayout[] = [
    {
      slotId: 'center',
      x: 0,
      y: 0,
      width: draw.width,
      height: draw.height,
      rotateDeg: 0,
      zIndex: 1,
    },
  ]
  return {
    cards,
    cardWidth: draw.width,
    cardHeight: draw.height,
    drawCardWidth: draw.width,
    drawCardHeight: draw.height,
    stageShiftY: 0,
    stage,
    drawer,
    envelope,
  }
}
