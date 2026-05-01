/**
 * Name: use_lifecycle
 * Purpose: overlay animation lifecycle — entry settling, scene reset, animation interruption,
 *          and pipeline orchestration (start / skip / replay).
 * Reason: extracted from use_animation_controller to isolate lifecycle concerns.
 * Data flow: receives all deps via DI; mutates shared refs for cardsLanded, entryAnimationComplete.
 */

import { nextTick } from 'vue'
import { killAnimationTargets } from '../animation/adapters/gsap'
import type { OverlayPhase } from '../core/flow/types'
import { runPipelineCommand } from './commands/start'
import { skipToReadingCommand } from './commands/skip_to_reading'
import { replayFromPhaseCommand } from './commands/replay_from_phase'
import type { LifecycleDeps } from './use_lifecycle_types'

export type { LifecycleAnimState, LifecycleDeps } from './use_lifecycle_types'

export function useLifecycle(deps: LifecycleDeps) {
  function settleEntryAnimation(): void {
    const { animState, entryAnimationComplete } = deps
    animState.bg.opacity = 1
    animState.refreshBg()
    animState.initials.forEach((state, index) => {
      Object.assign(state, { x: 0, y: -(index * 0.8), rotation: 0, scale: 1, scaleY: 1, opacity: 1 })
    })
    animState.refreshInitials()
    animState.header.y = 0
    animState.header.opacity = 1
    animState.footer.y = 0
    animState.footer.opacity = 1
    animState.refreshHeader()
    animState.refreshFooter()
    entryAnimationComplete.value = true
  }

  function resetOverlayScene(): void {
    deps.showResults.value = false
    deps.cardsLanded.value = false
    deps.callbacks.onResetReading()
    const { animState } = deps
    animState.bg.opacity = 1
    animState.stage.y = 0
    animState.header.y = 0
    animState.header.opacity = 1
    animState.footer.y = 0
    animState.footer.opacity = 1
    animState.deckCtn.x = 0
    animState.refreshBg()
    animState.refreshStage()
    animState.refreshHeader()
    animState.refreshFooter()
    animState.refreshDeckCtn()
    animState.resetInitialDeckState()
    animState.resetShuffleVisualState()
    animState.resetCutVisualState()
    animState.resetDrawVisualState()
    const drawLayout = deps.getSceneLayout('draw_stage')
    animState.setDrawCardSizes(drawLayout)
  }

  function interruptCurrentAnimation(): void {
    deps.callbacks.onDestroyReading()
    deps.resumeAnimations()
    deps.orchestrator.clear()
    killAnimationTargets(deps.animState.getAllTargets())
  }

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
      openReadingPanel: () => { deps.showResults.value = true },
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

  function skipToReading(): void {
    skipToReadingCommand({
      interruptCurrentAnimation,
      entryAnimationComplete: deps.entryAnimationComplete,
      resetOverlayScene,
      transitionPhase: (p) => deps.transitionPhase(p, deps.callbacks.onPhaseChange),
      openReadingPanel: () => { deps.showResults.value = true },
      getSceneLayout: deps.getSceneLayout,
      setDrawCardSizes: (layout) => deps.animState.setDrawCardSizes(layout),
      draws: deps.animState.draws,
      refreshDraws: deps.animState.refreshDraws,
      onPipelineComplete: deps.callbacks.onPipelineComplete,
    })
  }

  function replayFromPhase(targetPhase: OverlayPhase): void {
    replayFromPhaseCommand(targetPhase, {
      interruptCurrentAnimation,
      entryAnimationComplete: deps.entryAnimationComplete,
      resetOverlayScene,
      phaseRef: deps.phase,
      progressModel: deps.progressModel,
      onPhaseChange: (p) => deps.transitionPhase(p, deps.callbacks.onPhaseChange),
      runPipelineFn: runPipeline,
    })
  }

  return {
    settleEntryAnimation,
    resetOverlayScene,
    interruptCurrentAnimation,
    runPipeline,
    start,
    skipToReading,
    replayFromPhase,
  }
}
