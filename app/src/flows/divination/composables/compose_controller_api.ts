/**
 * Name: flows/divination/composables/compose_controller_api
 * Purpose: flatten the animation controller's composed parts (animation state, playback,
 *          presentation, phases, lifecycle, layout) into the public
 *          UseAnimationControllerReturn surface.
 * Reason: extracted from use_animation_controller so the orchestrator owns hook
 *          composition and this module owns the public API shape.
 */

import { killAnimationTargets } from '../../../core/gsap/tween'
import type { Ref } from 'vue'
import type { useAnimationState } from '../../base/composables/animations/use_animation_state'
import type { useOverlayLayout } from '../../../core/sizing/overlay_layout/use_overlay_layout'
import type { usePlayback } from '../../base/composables/animations/use_playback'
import type { usePhases } from './use_phase_state'
import type { usePresentation } from './use_presentation'
import type { useLifecycle } from './use_lifecycle'
import type { UseAnimationControllerReturn } from './use_animation_controller'

export interface ControllerParts {
  animState: ReturnType<typeof useAnimationState>
  playback: ReturnType<typeof usePlayback>
  presentation: ReturnType<typeof usePresentation>
  phases: ReturnType<typeof usePhases>
  lifecycle: ReturnType<typeof useLifecycle>
  getSceneLayout: ReturnType<typeof useOverlayLayout>['getSceneLayout']
  refs: {
    showResults: Ref<boolean>
    entryAnimationComplete: Ref<boolean>
    cardsLanded: Ref<boolean>
  }
  constants: {
    deckCount: number
    shuffleHalfCount: number
    cutPileCount: number
    cardsPerPile: number
  }
  updateLayout: () => void
  openAnswer: () => void
}

export function composeControllerApi(parts: ControllerParts): UseAnimationControllerReturn {
  const { animState, playback, presentation, phases, lifecycle, refs, constants } = parts
  return {
    phase: phases.phase,
    showResults: refs.showResults,
    entryAnimationComplete: refs.entryAnimationComplete,
    isPaused: playback.isPaused,
    playbackRate: playback.playbackRate,
    cardsLanded: refs.cardsLanded,
    bgStyle: animState.bgStyle,
    stageStyle: animState.stageStyle,
    headerStyle: animState.headerStyle,
    footerStyle: animState.footerStyle,
    deckCtnStyle: animState.deckCtnStyle,
    initialsStyle: animState.initialsStyle,
    leftsStyle: animState.leftsStyle,
    rightsStyle: animState.rightsStyle,
    pilesStyle: animState.pilesStyle,
    drawsStyle: animState.drawsStyle,
    drawsSizeStyle: animState.drawsSizeStyle,
    innersStyle: animState.innersStyle,
    leftsVisible: animState.leftsVisible,
    rightsVisible: animState.rightsVisible,
    pilesVisible: animState.pilesVisible,
    drawsVisible: animState.drawsVisible,
    overlayVarsStyle: animState.overlayVarsStyle,
    layoutCardWidth: animState.layoutCardWidth,
    layoutCardHeight: animState.layoutCardHeight,
    progressHeaderPresentation: presentation.progressHeaderPresentation,
    footerPresentation: presentation.footerPresentation,
    phaseSteps: presentation.phaseSteps,
    activePhaseIndex: presentation.activePhaseIndex,
    getSceneLayout: parts.getSceneLayout,
    deckCount: constants.deckCount,
    shuffleHalfCount: constants.shuffleHalfCount,
    cutPileCount: constants.cutPileCount,
    cardsPerPile: constants.cardsPerPile,
    draws: animState.draws,
    refreshDraws: animState.refreshDraws,
    setPlaybackRate: playback.setPlaybackRate,
    pauseAnimations: playback.pauseAnimations,
    resumeAnimations: playback.resumeAnimations,
    stepForward: playback.stepForward,
    stepBackward: playback.stepBackward,
    seek: playback.seek,
    replayFromPhase: lifecycle.replayFromPhase,
    skipToAnswer: lifecycle.skipToAnswer,
    resetOverlayScene: lifecycle.resetOverlayScene,
    start: lifecycle.start,
    updateLayout: parts.updateLayout,
    openAnswer: parts.openAnswer,
    setDrawCardSizes: animState.setDrawCardSizes,
    clearTimeline: playback.clearTimeline,
    killTimeline: playback.killTimeline,
    killAnimationTargets: () => killAnimationTargets(animState.getAllTargets()),
    resetProgressModel: () => phases.progressModel.reset(),
  }
}
