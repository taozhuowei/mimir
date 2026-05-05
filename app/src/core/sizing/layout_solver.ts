/**
 * Name: core/sizing/layout_solver
 * Purpose: pure layout solver for the tarot reading flow. Given a viewport,
 *          ResponsiveSizes, and a scene kind, returns a fully described
 *          SceneLayout (card rects, drawer geometry, stage rect, animation
 *          envelope) — every value derived from a single 1:1.6 stage rect
 *          centered horizontally in the canvas.
 *
 *          This file is a small facade: the type surface lives in
 *          `layout_solver_types.ts` and the per-scene pure computers live
 *          in `layout_solver_computers.ts`. `solveLayout` orchestrates
 *          them and assembles the final `SceneLayout`. Public API
 *          unchanged from before the split — every type and the function
 *          itself are re-exported here so downstream importers stay
 *          identical.
 *
 * Reason: the previous monolithic 345-line implementation accumulated
 *         types + four computers + the orchestrator in one file. Splitting
 *         them keeps each piece small and reviewable while the public
 *         contract (types + `solveLayout`) is preserved exactly.
 *
 * Purity: pure function. No window access, no DOM, no global state. The
 *         caller is responsible for collecting the viewport and sizes.
 *
 * Data flow:
 *   readViewport(windowInfo) ──▶ pickCanvasWidth ──┐
 *                                                  ├──▶ solveLayout({viewport, sizes, scene}) ──▶ SceneLayout
 *   deriveSizes(canvasWidth) ───────────────────────┘
 */

import { CARD_ASPECT_RATIO, MAX_CARD_WIDTH_PX, RESULT_CARD_FILL_RATIO } from './scale'
import { INITIAL_DRAWER_HEIGHT_RATIO } from '../config/layout_constants'
import {
  computeDrawCardSize,
  computeDrawer,
  computeEnvelope,
  computeStage,
} from './layout_solver_computers'
import type { CardLayout, SceneLayout, SolveLayoutInput } from './layout_solver_types'

// Re-export the type surface from the dedicated module so existing
// `import { ... } from '.../layout_solver'` calls keep working unchanged.
export type {
  CardLayout,
  DrawerGeometry,
  LayoutEnvelope,
  StageRect,
  SceneLayout,
  SceneKind,
  SolveLayoutInput,
} from './layout_solver_types'

/**
 * Solve the layout for one scene.
 *
 * Pure function: identical inputs produce identical outputs, no side effects.
 *
 * Strategy
 * ────────
 *  1. Compute the stage rect — largest 1:1.6 box that fits the canvas after
 *     subtracting margins, header, and safe areas. The stage is centered
 *     horizontally and pinned below the header.
 *  2. Compute the 3-pile draw card size from the stage (one card per pile).
 *  3. Compose the result-stage card (= stage rect — single card fills it).
 *  4. Compute drawer geometry as a bottom sheet anchored to the stage bottom.
 *  5. Build the animation envelope from the draw card size.
 */
export function solveLayout(input: SolveLayoutInput): SceneLayout {
  const { viewport, sizes, scene } = input

  // The reading scene's drawer occupies the bottom INITIAL_DRAWER_HEIGHT_RATIO
  // of the viewport on first reveal, and the ActionArea (decision-phase
  // CTAs) sits below the drawer in the same bottom band. Reserve both
  // when computing the reading stage so the result card auto-shrinks and
  // lifts up into the remaining area instead of being half-covered by
  // the drawer + buttons. The draw scene reserves 0 — the drawer is
  // closed and the action area is hidden during shuffle/cut/draw, so
  // the stage gets the full available height for animations.
  const drawerReservation =
    scene === 'reading_stage'
      ? Math.round(viewport.height * INITIAL_DRAWER_HEIGHT_RATIO) +
        sizes.actionAreaHeight
      : 0
  const stage = computeStage(viewport, sizes, drawerReservation)
  const draw = computeDrawCardSize(stage, sizes)
  const envelope = computeEnvelope(draw.width, draw.height, sizes.gap)

  // Result card occupies RESULT_CARD_FILL_RATIO of the stage rect on each
  // axis, then clamped to MAX_CARD_WIDTH_PX (PRD §8.2 phone-shell
  // envelope — the card never grows wider than 240 px regardless of how
  // big the canvas / stage is). Height is derived from the clamped width
  // via CARD_ASPECT_RATIO so the card preserves its 1:1.6 proportion when
  // the cap engages on the largest supported canvases.
  // Stage rect itself stays the same — the card sits centred inside,
  // padded uniformly. The card stays centred at (0, 0) in stage-relative
  // coordinates because the stage container is the anchor.
  const unclampedCardWidth = stage.width * RESULT_CARD_FILL_RATIO
  const resultCardWidth = Math.min(unclampedCardWidth, MAX_CARD_WIDTH_PX)
  const resultCardHeight =
    resultCardWidth === unclampedCardWidth
      ? stage.height * RESULT_CARD_FILL_RATIO
      : resultCardWidth * CARD_ASPECT_RATIO

  // Cards array: one centred placeholder. Concrete shuffle / cut / draw /
  // reveal phases position individual cards themselves; the solver only
  // emits a rest layout the controller can use as a fallback.
  if (scene === 'reading_stage') {
    // Drawer anchors to the result card's bottom edge (not stage bottom)
    // so the drawer naturally hugs the card on the reading scene.
    const drawer = computeDrawer(viewport, stage, resultCardHeight)
    const cards: CardLayout[] = [
      {
        slotId: 'center',
        x: 0,
        y: 0,
        width: resultCardWidth,
        height: resultCardHeight,
        rotateDeg: 0,
        zIndex: 1,
      },
    ]
    return {
      cards,
      cardWidth: resultCardWidth,
      cardHeight: resultCardHeight,
      drawCardWidth: draw.width,
      drawCardHeight: draw.height,
      stageShiftY: 0,
      stage,
      drawer,
      envelope,
    }
  }

  // draw_stage: drawer keeps anchoring to the stage bottom (same behaviour
  // as before this change). Pass `stage.height` so cardBottom collapses to
  // `stage.y + stage.height` per the formula in computeDrawer's docstring.
  const drawer = computeDrawer(viewport, stage, stage.height)

  // draw_stage: single centered slot at (0, 0) using the draw card size.
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
