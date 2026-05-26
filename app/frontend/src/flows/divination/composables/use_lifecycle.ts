/**
 * Name: flows/divination/composables/use_lifecycle
 * Purpose: overlay animation lifecycle orchestrator — composes the scene visual-state ops
 *          (lifecycle_scene) and the pipeline command (start) into the lifecycle surface.
 * Reason: scene mutations are extracted to a sibling module so this file stays a thin
 *          orchestrator.
 * Data flow: receives all deps via DI; mutates shared refs for cardsLanded, entryAnimationComplete.
 */

import { nextTick } from 'vue'
import { runPipelineCommand } from './run_pipeline_command'
import { createLifecycleScene } from './lifecycle_scene'
import type { LifecycleDeps } from './use_lifecycle_types'

export type { LifecycleAnimState, LifecycleDeps } from './use_lifecycle_types'

export function useLifecycle(deps: LifecycleDeps) {
  const { settleEntryAnimation, resetOverlayScene } = createLifecycleScene(deps)

  function runPipeline(startIndex = 0): void {
    runPipelineCommand(startIndex, {
      orchestrator: deps.orchestrator,
      getDeckCenter: deps.getDeckCenter,
      getOverlayLayouts: deps.getOverlayLayouts,
      getMotionMetrics: deps.getMotionMetrics,
      cardElements: deps.cardElements,
      visible: deps.visible,
      deckCount: deps.deckCount,
      setDrawCardSizes: (layout) => deps.animState.setDrawCardSizes(layout),
      cutPileCount: deps.cutPileCount,
      cardCountRef: deps.cardCount,
      autoRevealDelayMs: deps.autoRevealDelayMs,
      cardsLandedRef: deps.cardsLanded,
      onPhaseChange: (p) => deps.transitionPhase(p, deps.callbacks.onPhaseChange),
      settleEntryAnimation,
      openAnswer: () => { deps.showResults.value = true },
      onDrawingStart: deps.callbacks.onDrawingStart,
      onPipelineComplete: deps.callbacks.onPipelineComplete,
    })
  }

  function start(): void {
    nextTick(() => {
      settleEntryAnimation()
      runPipeline(0)
    })
  }

  return {
    settleEntryAnimation,
    resetOverlayScene,
    runPipeline,
    start,
  }
}
