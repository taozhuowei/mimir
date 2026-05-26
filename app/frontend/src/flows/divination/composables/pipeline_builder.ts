/**
 * Name: flows/divination/composables/pipeline_builder
 * Purpose: pure helpers that build PhaseContext and PhaseRunner[] from deps.
 * Reason: extracted from commands/start to keep start.ts within the 180-line TS limit.
 *         buildPhaseRunners now iterates the PHASE_MANIFEST so adding/reordering
 *         a phase happens in one place (registry) rather than two.
 * Data flow: deps in → phase context / runner array out; creates no state.
 */

import type { Ref } from 'vue'
import { buildShufflePhaseRunner } from './phases/shuffle'
import { buildCutPhaseRunner } from './phases/cut'
import { buildDrawPhaseRunner } from './phases/draw'
import { buildRevealPhaseRunner } from './phases/reveal'
import { PHASE_MANIFEST } from './phase_registry'
import type { PhaseContext, PhaseRunner, OverlayPhase } from '../../base/composables/animations/phase_contracts'
import type { SceneKind, SceneLayout } from '../../../core/sizing/layout_solver'
import type { MotionMetrics } from '../../../core/sizing/overlay_layout/use_overlay_layout'

export function buildPhaseContext(deps: {
  getDeckCenter: () => { centerX: number; centerY: number }
  getOverlayLayouts: () => { drawLayout: SceneLayout }
  cardElements: PhaseContext['cardElements']
  visible: PhaseContext['visible']
  deckCount: number
  onPhaseChange: (phase: OverlayPhase) => void
}): PhaseContext {
  const { centerX, centerY } = deps.getDeckCenter()
  return {
    deckGeometry: {
      centerX,
      centerY,
      cardOffsetStep: { x: 0, y: -0.8 },
      totalOffset: { x: 0, y: -(deps.deckCount - 1) * 0.8 },
    },
    spreadSlots: [],
    getCurrentLayouts: () => {
      const { drawLayout } = deps.getOverlayLayouts()
      return { drawLayout }
    },
    getTargetLayouts: () => {
      const { drawLayout } = deps.getOverlayLayouts()
      return { drawLayout }
    },
    cardElements: deps.cardElements,
    visible: deps.visible,
    onPhaseChange: deps.onPhaseChange,
  }
}

interface PhaseRunnerDeps {
  getMotionMetrics: (scene: SceneKind) => MotionMetrics
  getOverlayLayouts: () => {
    drawViewport: { stageHeight: number }
    drawLayout: SceneLayout
    /**
     * Single answer-stage card size — reveal grows the card directly to
     * this rect, which already excludes the answer-zone + action-area
     * reservation, so the card never overflows the stage.
     */
    resultLayout: {
      cardWidth: number
      cardHeight: number
    }
  }
  setDrawCardSizes: (layout: SceneLayout) => void
  cutPileCount: number
  cardCountRef: Ref<number>
  autoRevealDelayMs: number
  cardsLandedRef: Ref<boolean>
}

function buildDrawingRunner(deps: PhaseRunnerDeps): PhaseRunner {
  return {
    name: 'drawing',
    run(context: PhaseContext, onComplete: () => void) {
      const { drawLayout, drawViewport } = deps.getOverlayLayouts()
      deps.setDrawCardSizes(drawLayout)
      const runner = buildDrawPhaseRunner({
        cardCount: deps.cardCountRef.value,
        cardWidth: drawLayout.drawCardWidth,
        cardHeight: drawLayout.drawCardHeight,
        stageHeight: drawViewport.stageHeight,
        liftY: drawLayout.stageShiftY,
        targetX: drawLayout.cards.map((c) => c.x),
        targetY: drawLayout.cards.map((c) => c.y),
        autoRevealDelayMs: deps.autoRevealDelayMs,
        onCardsLanded: () => { deps.cardsLandedRef.value = true },
      })
      return runner.run(context, onComplete)
    },
  }
}

function buildRevealingRunner(deps: PhaseRunnerDeps): PhaseRunner {
  return {
    name: 'revealing',
    run(context: PhaseContext, onComplete: () => void) {
      const { drawLayout, resultLayout } = deps.getOverlayLayouts()
      deps.setDrawCardSizes(drawLayout)
      // Grow cards to the answer-stage result-card size. The stage rect
      // the size is computed against already excludes the answer-zone
      // + action-area reservation, so the card lands exactly inside
      // the Stage flex DOM box once the answer flow mounts those
      // siblings; no post-reveal shrink is needed.
      const runner = buildRevealPhaseRunner({
        cardCount: deps.cardCountRef.value,
        drawCardWidth: drawLayout.drawCardWidth,
        drawCardHeight: drawLayout.drawCardHeight,
        resultCardWidth: resultLayout.cardWidth,
        resultCardHeight: resultLayout.cardHeight,
        drawLayout: {
          stageShiftY: drawLayout.stageShiftY,
          cards: drawLayout.cards.map((c) => ({ x: c.x, y: c.y })),
        },
      })
      return runner.run(context, onComplete)
    },
  }
}

/**
 * Build phase runners following the PHASE_MANIFEST order. The manifest is the
 * canonical source of phase ordering; this switch maps each phase name to its
 * concrete builder. Adding a new phase = add it to the manifest and add the
 * matching case here.
 */
export function buildPhaseRunners(deps: PhaseRunnerDeps): PhaseRunner[] {
  const metrics = deps.getMotionMetrics('draw_stage')
  return PHASE_MANIFEST.map((m) => {
    switch (m.phase) {
      case 'shuffling':
        return buildShufflePhaseRunner({ spreadX: metrics.shuffleSpreadX })
      case 'cutting':
        return buildCutPhaseRunner({
          pileCount: deps.cutPileCount,
          pileSpacing: metrics.cutPileSpacing,
          axis: metrics.cutAxis,
          cutLeadingOffset: metrics.cutLeadingOffset,
          cutTrailingOffset: metrics.cutTrailingOffset,
        })
      case 'drawing':
        return buildDrawingRunner(deps)
      case 'revealing':
        return buildRevealingRunner(deps)
      default: {
        // Exhaustiveness guard — TS will flag this if a new phase is added
        // to OverlayPhase without a corresponding builder case here.
        const _exhaustive: never = m.phase
        throw new Error(`buildPhaseRunners: unhandled phase "${String(_exhaustive)}"`)
      }
    }
  })
}
