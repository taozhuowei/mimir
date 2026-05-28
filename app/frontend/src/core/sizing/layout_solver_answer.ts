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
 * 答案场景 stage 下方预留高度：答案卡 min-height + 操作区高 + 两段
 * 容器间距（stage↔answer-card、answer-card↔action-area）。三者均在
 * `main-surface__body` 的 flex 兄弟链上同帧挂载；reservation 与渲染
 * 同源，保证 result card 90% × stage 不被 flex 再次挤压。
 * 答案卡内容超过 min-height 时由 flex 运行时压缩 stage，求解器保持保守。
 */
export function answerStageReservation(
  _viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
): number {
  return (
    sizes.answerZoneMinHeight +
    sizes.actionAreaHeight +
    2 * sizes.containerGap
  )
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
