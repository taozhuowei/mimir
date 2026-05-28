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
 * 策略
 * ────
 *  1. 求解 stage 矩形 —— 画布扣减 margin / safe-area / header / topInset
 *     （header↔stage 容器间距，所有场景均扣）/ bottomReservation（答案
 *     场景下：答案卡 min-height + 操作区高 + 2 段容器间距）后，能容下
 *     的最大 1:1.6 盒子。水平居中、垂直锚 header 下。
 *  2. 由 stage 推三堆抽牌尺寸（每堆一张）。
 *  3. 按场景分派：
 *     - answer_stage：`solveAnswerStageLayout`（单结果卡 + 下方 drawer）
 *     - draw_stage：`solveDrawStageLayout`（中心一槽 + drawer 锚 stage 底）
 */
export function solveLayout(input: SolveLayoutInput): SceneLayout {
  const { viewport, sizes, scene } = input
  // header 与 stage 之间永远有 1 段容器间距（main-surface__body 的 gap），
  // 求解器必须扣减以与渲染同源。
  const topInset = sizes.containerGap
  if (scene === 'answer_stage') {
    // 答案场景：stage 下方预留 = 答案卡 min-height + 操作区 + 2 段间距。
    // 卡牌直接长到 `RESULT_CARD_FILL_RATIO × stage`，不再保留 pre-reveal
    // 中间态——答案区由 CSS min-height 锁定，与求解器扣减天然同源。
    const reservation = answerStageReservation(viewport, sizes)
    const stageShrunk = computeStage(viewport, sizes, reservation, topInset)
    const draw = computeDrawCardSize(stageShrunk, sizes)
    return solveAnswerStageLayout(viewport, sizes, stageShrunk, draw)
  }
  const stage = computeStage(viewport, sizes, 0, topInset)
  const draw = computeDrawCardSize(stage, sizes)
  return solveDrawStageLayout(viewport, sizes, stage, draw)
}
