/**
 * Name: flows/divination/composables/use_lifecycle
 * Purpose: overlay animation lifecycle orchestrator — composes the scene visual-state ops
 *          (lifecycle_scene), the phase-snap deps assembly (build_phase_snap_deps) and the
 *          pipeline commands (start / skip / replay) into the lifecycle surface.
 * Reason: scene mutations and snap-deps assembly are extracted to sibling modules so this
 *          file stays a thin orchestrator.
 * Data flow: receives all deps via DI; mutates shared refs for cardsLanded, entryAnimationComplete.
 */

import { nextTick } from 'vue'
import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'
import { runPipelineCommand } from './run_pipeline_command'
import { skipToAnswerCommand } from './skip_to_answer'
import { replayFromPhaseCommand } from './replay_from_phase'
import { createLifecycleScene } from './lifecycle_scene'
import { buildPhaseSnapDeps } from './build_phase_snap_deps'
import type { LifecycleDeps } from './use_lifecycle_types'

export type { LifecycleAnimState, LifecycleDeps } from './use_lifecycle_types'

export function useLifecycle(deps: LifecycleDeps) {
  const { settleEntryAnimation, resetOverlayScene, interruptCurrentAnimation } =
    createLifecycleScene(deps)

  const getPhaseSnapDeps = () => buildPhaseSnapDeps(deps)

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

  function skipToAnswer(): void {
    skipToAnswerCommand({
      interruptCurrentAnimation,
      entryAnimationComplete: deps.entryAnimationComplete,
      resetOverlayScene,
      transitionPhase: (p) => deps.transitionPhase(p, deps.callbacks.onPhaseChange),
      openAnswer: () => { deps.showResults.value = true },
      refreshDraws: deps.animState.refreshDraws,
      onPipelineComplete: deps.callbacks.onPipelineComplete,
      getPhaseSnapDeps,
    })
  }

  function replayFromPhase(targetPhase: OverlayPhase): void {
    // The command is async (it awaits nextTick before runPipeline so the
    // visible-flag mutations flush). We can't await here — the lifecycle
    // surface is sync — but a `void` swallow would silently drop any
    // rejection from the command's internals (snap helpers, runPipeline).
    // Surface them via console.error so dev-tool failures aren't invisible.
    replayFromPhaseCommand(targetPhase, {
      interruptCurrentAnimation,
      entryAnimationComplete: deps.entryAnimationComplete,
      resetOverlayScene,
      phaseRef: deps.phase,
      progressModel: deps.progressModel,
      onPhaseChange: (p) => deps.transitionPhase(p, deps.callbacks.onPhaseChange),
      runPipelineFn: runPipeline,
      getPhaseSnapDeps,
    }).catch((err) => {
      console.error('[lifecycle] replayFromPhase failed', err)
    })
  }

  return {
    settleEntryAnimation,
    resetOverlayScene,
    interruptCurrentAnimation,
    runPipeline,
    start,
    skipToAnswer,
    replayFromPhase,
  }
}
