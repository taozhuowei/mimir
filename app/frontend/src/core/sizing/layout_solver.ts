/**
 * Name: core/sizing/layout_solver
 * Purpose: pure layout solver for the tarot divination flow. Given a viewport,
 *          ResponsiveSizes, and a scene kind, returns a fully described
 *          SceneLayout (card rects, drawer geometry, stage rect, animation
 *          envelope) — every value derived from a single 1:1.6 stage rect
 *          centered horizontally in the canvas.
 *
 *          This file is a small facade: the type surface lives in
 *          `layout_solver_types.ts`, the per-scene pure computers in
 *          `layout_solver_computers.ts`, and the per-scene assemblers in
 *          `layout_solver_answer.ts` / `layout_solver_draw.ts`.
 *          `solveLayout` dispatches to them; the public API is unchanged —
 *          every type and the function itself are re-exported here so
 *          downstream importers stay identical.
 *
 * Reason: the previous monolithic implementation accumulated types + four
 *         computers + two per-scene assemblers + the orchestrator in one
 *         file. Splitting them keeps each piece small and reviewable while
 *         the public contract (types + `solveLayout`) is preserved exactly.
 *
 * Purity: pure function. No window access, no DOM, no global state. The
 *         caller is responsible for collecting the viewport and sizes.
 *
 * Data flow:
 *   readViewport(windowInfo) ──▶ pickCanvasWidth ──┐
 *                                                  ├──▶ solveLayout({viewport, sizes, scene}) ──▶ SceneLayout
 *   deriveSizes(canvasWidth) ───────────────────────┘
 */

import {
  computeDrawCardSize,
  computeStage,
} from './layout_solver_computers'
import type {
  SceneLayout,
  SolveLayoutInput,
} from './layout_solver_types'
import {
  answerStageReservation,
  solveAnswerStageLayout,
} from './layout_solver_answer'
import { solveDrawStageLayout } from './layout_solver_draw'

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
 *  1. Compute the stage rect — largest 1:1.6 box that fits the canvas
 *     after subtracting margins, header, safe areas, and (on the answer
 *     scene) the bottom drawer + action-area reservation. The stage is
 *     centred horizontally and pinned below the header.
 *  2. Compute the 3-pile draw card size from the stage (one card per pile).
 *  3. Dispatch to the per-scene composer:
 *     - answer_stage: `solveAnswerStageLayout` (single result card +
 *       bottom drawer anchored to its bottom edge).
 *     - draw_stage: `solveDrawStageLayout` (one centered slot + drawer
 *       anchored to the stage bottom).
 */
export function solveLayout(input: SolveLayoutInput): SceneLayout {
  const { viewport, sizes, scene } = input
  if (scene === 'answer_stage') {
    // Single stage rect for the answer scene: safe-area minus the
    // bottom inline answer-zone + action-area reservation. The card is
    // grown directly to this rect's `RESULT_CARD_FILL_RATIO`; no
    // "stage full" pre-reservation rect is exposed because the
    // answer zone height is CSS-locked, so the DOM-occupied space and
    // the solver's reservation match by construction.
    const reservation = answerStageReservation(viewport, sizes)
    const stageShrunk = computeStage(viewport, sizes, reservation)
    const draw = computeDrawCardSize(stageShrunk, sizes)
    return solveAnswerStageLayout(viewport, sizes, stageShrunk, draw)
  }
  const stage = computeStage(viewport, sizes, 0)
  const draw = computeDrawCardSize(stage, sizes)
  return solveDrawStageLayout(viewport, sizes, stage, draw)
}
