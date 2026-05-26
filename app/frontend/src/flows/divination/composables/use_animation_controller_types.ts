/**
 * Name: flows/divination/composables/use_animation_controller_types
 * Purpose: public type contracts for the animation controller (callbacks, deps, and the
 *          UseAnimationControllerReturn surface). Separated so use_animation_controller and
 *          compose_controller_api can both reference the return type without a circular import.
 * Data flow: pure type module — imported by use_animation_controller and compose_controller_api.
 */

import type { ComputedRef, Ref } from 'vue'
import type { DrawCardState } from '../../base/composables/animations/state_types'
import type { StyleReconciler } from '../../base/composables/animations/style_sync'
import type { useTarotStore } from '../../../core/store/tarot'
import type { useThemeStore } from '../../../core/store/theme'
import type { useAnimationState } from '../../base/composables/animations/use_animation_state'
import type { useOverlayLayout } from '../../../core/sizing/overlay_layout/use_overlay_layout'
import type { presentProgressHeader, presentFooter } from './progress_presenter'
import type { calculatePhaseProgress } from './progress_model'
import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'

export interface UseAnimationControllerCallbacks {
  onDrawingStart?: () => void
  onPipelineComplete: () => void
  onPhaseChange: (phase: OverlayPhase) => void
  onResetAnswer: () => void
  onDestroyAnswer: () => void
}

export interface UseAnimationControllerDeps {
  tarotStore: ReturnType<typeof useTarotStore>
  themeStore: ReturnType<typeof useThemeStore>
  isWide: Ref<boolean>
  cardCount: Ref<number>
  callbacks: UseAnimationControllerCallbacks
}

/**
 * Style fields the controller passes through from the StyleReconciler.
 * Using Pick (not full `extends StyleReconciler`) because the controller
 * intentionally hides the internal `refresh*` methods (refreshBg / refreshStage
 * / refreshLefts / etc.) — only `refreshDraws` is part of the public surface
 * (consumed by DivinationDeck.vue when the layout reflows mid-pipeline).
 * Adding a new style ref to StyleReconciler still needs to be added here,
 * but the field shape (Ref<...>) stays in lockstep automatically.
 */
type ReconcilerPublic = Pick<StyleReconciler,
  | 'bgStyle' | 'stageStyle' | 'headerStyle' | 'footerStyle' | 'deckCtnStyle'
  | 'initialsStyle' | 'leftsStyle' | 'rightsStyle' | 'pilesStyle'
  | 'drawsStyle' | 'drawsSizeStyle' | 'innersStyle' | 'overlayVarsStyle'
  | 'layoutCardWidth' | 'layoutCardHeight'
  | 'refreshDraws' | 'setDrawCardSizes'
>

export interface UseAnimationControllerReturn extends ReconcilerPublic {
  phase: Ref<OverlayPhase>
  showResults: Ref<boolean>
  entryAnimationComplete: Ref<boolean>
  isPaused: Ref<boolean>
  playbackRate: Ref<number>
  cardsLanded: Ref<boolean>
  leftsVisible: Ref<boolean>
  rightsVisible: Ref<boolean>
  pilesVisible: Ref<boolean[]>
  drawsVisible: Ref<boolean[]>
  progressHeaderPresentation: ComputedRef<ReturnType<typeof presentProgressHeader>>
  footerPresentation: ComputedRef<ReturnType<typeof presentFooter>>
  phaseSteps: ComputedRef<ReturnType<typeof calculatePhaseProgress>>
  activePhaseIndex: ComputedRef<number>
  getSceneLayout: ReturnType<typeof useOverlayLayout>['getSceneLayout']
  deckCount: number
  shuffleHalfCount: number
  cutPileCount: number
  cardsPerPile: number
  draws: DrawCardState[]
  refreshDraws: () => void
  setPlaybackRate: (rate: number) => void
  pauseAnimations: () => void
  resumeAnimations: () => void
  stepForward: () => void
  stepBackward: () => void
  seek: (position: number | string) => void
  replayFromPhase: (targetPhase: OverlayPhase) => void
  skipToAnswer: () => void
  resetOverlayScene: () => void
  start: () => void
  updateLayout: () => void
  openAnswer: () => void
  setDrawCardSizes: ReturnType<typeof useAnimationState>['setDrawCardSizes']
  clearTimeline: () => void
  killTimeline: () => void
  killAnimationTargets: () => void
  resetProgressModel: () => void
}
