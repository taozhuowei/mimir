/**
 * Name: flows/divination/composables/build_lifecycle_deps
 * Purpose: assemble the LifecycleDeps bundle that useAnimationController feeds into
 *          useLifecycle — mapping the animation-state bag, layout solver, shared refs
 *          and callbacks into the lifecycle's DI contract.
 * Reason: extracted from use_animation_controller to keep that orchestrator focused on
 *          hook composition rather than dependency plumbing.
 */

import type { Ref } from 'vue'
import type { useAnimationState } from '../../base/composables/animations/use_animation_state'
import type { useOverlayLayout } from '../../../core/sizing/overlay_layout/use_overlay_layout'
import type { usePlayback } from '../../base/composables/animations/use_playback'
import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'
import type { ProgressModel } from './progress_model'
import type { LifecycleDeps } from './use_lifecycle_types'

export interface LifecycleDepsContext {
  orchestrator: ReturnType<typeof usePlayback>['orchestrator']
  animState: ReturnType<typeof useAnimationState>
  layoutApi: ReturnType<typeof useOverlayLayout>
  showResults: Ref<boolean>
  cardsLanded: Ref<boolean>
  entryAnimationComplete: Ref<boolean>
  phase: Ref<OverlayPhase>
  progressModel: ProgressModel
  cardCount: Ref<number>
  transitionPhase: LifecycleDeps['transitionPhase']
  callbacks: LifecycleDeps['callbacks']
  resumeAnimations: () => void
  deckCount: number
  cutPileCount: number
  autoRevealDelayMs: number
}

export function buildLifecycleDeps(ctx: LifecycleDepsContext): LifecycleDeps {
  const { animState, layoutApi } = ctx
  return {
    orchestrator: ctx.orchestrator,
    animState: {
      bg: animState.bg,
      stage: animState.stage,
      header: animState.header,
      footer: animState.footer,
      deckCtn: animState.deckCtn,
      initials: animState.initials,
      draws: animState.draws,
      refreshBg: animState.refreshBg,
      refreshStage: animState.refreshStage,
      refreshHeader: animState.refreshHeader,
      refreshFooter: animState.refreshFooter,
      refreshDeckCtn: animState.refreshDeckCtn,
      refreshInitials: animState.refreshInitials,
      refreshDraws: animState.refreshDraws,
      resetInitialDeckState: animState.resetInitialDeckState,
      resetShuffleVisualState: animState.resetShuffleVisualState,
      resetCutVisualState: animState.resetCutVisualState,
      resetDrawVisualState: animState.resetDrawVisualState,
      setDrawCardSizes: animState.setDrawCardSizes,
      getAllTargets: animState.getAllTargets,
    },
    showResults: ctx.showResults,
    cardsLanded: ctx.cardsLanded,
    entryAnimationComplete: ctx.entryAnimationComplete,
    phase: ctx.phase,
    progressModel: ctx.progressModel,
    cardCount: ctx.cardCount,
    getDeckCenter: () => layoutApi.getDeckCenter(),
    getOverlayLayouts: () => layoutApi.getOverlayLayouts(),
    getMotionMetrics: (s) => layoutApi.getMotionMetrics(s),
    getSceneLayout: (s) => layoutApi.getSceneLayout(s),
    cardElements: {
      initials: animState.initials,
      lefts: animState.lefts,
      rights: animState.rights,
      piles: animState.piles,
      draws: animState.draws,
      inners: animState.inners,
      stage: animState.stage,
      deckCtn: animState.deckCtn,
      bg: animState.bg,
      header: animState.header,
      footer: animState.footer,
    },
    visible: {
      lefts: animState.leftsVisible,
      rights: animState.rightsVisible,
      piles: animState.pilesVisible,
      draws: animState.drawsVisible,
    },
    deckCount: ctx.deckCount,
    cutPileCount: ctx.cutPileCount,
    autoRevealDelayMs: ctx.autoRevealDelayMs,
    transitionPhase: ctx.transitionPhase,
    callbacks: ctx.callbacks,
    resumeAnimations: ctx.resumeAnimations,
  }
}
