/**
 * Name: flows/divination/composables/use_animation_controller
 * Purpose: thin orchestrator — composes usePhases, usePlayback, usePresentation,
 *          useAnimationState, and useLifecycle into the animation controller public API.
 * Reason: isolates GSAP-dependent code so answer controller never touches animation internals.
 * Constraint: does NOT import any module under `answer/`.
 * Data flow: deps in → wires hooks via DI → exposes unified public API surface.
 */

import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import gsap from 'gsap'
import type { DrawCardState } from '../../base/composables/animations/state_types'
import type { StyleReconciler } from '../../base/composables/animations/style_sync'
import { useTarotStore } from '../../../core/store/tarot'
import { useThemeStore } from '../../../core/store/theme'
import overlayConfig from '../../../config.json'
import { useAnimationState } from '../../base/composables/animations/use_animation_state'
import { useOverlayLayout } from '../../../core/sizing/overlay_layout/use_overlay_layout'
import { usePhases } from './use_phase_state'
import { usePlayback } from '../../base/composables/animations/use_playback'
import { usePresentation } from './use_presentation'
import { useLifecycle } from './use_lifecycle'
import { buildLifecycleDeps } from './build_lifecycle_deps'
import { composeControllerApi } from './compose_controller_api'
import { calculatePhaseProgress } from './progress_model'
import { presentProgressHeader, presentFooter } from './progress_presenter'
import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'
import { MAX_CARD_COUNT } from '../../base/composables/animations/animation_targets'
import { MAX_CUT_PILES } from './phase_entry_snap'

/**
 * Delay between the draw landing and the auto-flip kick-off (ms).
 *
 * Per requirement N2 this is now 0 — the deal-stage already provides a
 * settle beat (alignment tween + per-card settle), so an additional
 * pre-flip pause is dead weight. Keep the constant in place so phase
 * builders that read it stay configurable, but ship with no extra wait.
 */
const AUTO_REVEAL_DELAY_MS = 0

const DECK_COUNT: number = (overlayConfig as { deckCount?: number }).deckCount ?? 12
const CUT_PILE_COUNT: number = Math.min(
  MAX_CUT_PILES,
  Math.max(1, (overlayConfig as { cutPileCount?: number }).cutPileCount ?? 3),
)
const CARDS_PER_PILE: number = Math.max(1, Math.floor(DECK_COUNT / CUT_PILE_COUNT))
const SHUFFLE_HALF_COUNT: number = Math.max(1, Math.floor(DECK_COUNT / 2))

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

export function useAnimationController(deps: UseAnimationControllerDeps): UseAnimationControllerReturn {
  // Shared refs owned by this orchestrator — passed into hooks via DI
  const showResults = ref(false)
  const entryAnimationComplete = ref(false)
  const cardsLanded = ref(false)

  // ── Hooks: phases / playback / layout / animation-state / presentation ─
  const phases = usePhases()
  const playback = usePlayback()
  const layoutApi = useOverlayLayout({
    isWide: deps.isWide,
    spreadKind: 'single_card',
    cutPileCount: CUT_PILE_COUNT,
    deckCount: DECK_COUNT,
  })
  const animState = useAnimationState({
    deckCount: DECK_COUNT,
    shuffleHalfCount: SHUFFLE_HALF_COUNT,
    maxCutPiles: MAX_CUT_PILES,
    maxCardCount: MAX_CARD_COUNT,
  })
  const presentation = usePresentation({
    phase: phases.phase,
    showResults,
    getUiAsset: (name) => deps.themeStore.getUiAsset(name),
  })

  // ── Hook: lifecycle (entry settle, reset, interrupt, pipeline) ────────
  const lifecycle = useLifecycle(buildLifecycleDeps({
    orchestrator: playback.orchestrator,
    animState,
    layoutApi,
    showResults,
    cardsLanded,
    entryAnimationComplete,
    phase: phases.phase,
    progressModel: phases.progressModel,
    cardCount: deps.cardCount,
    transitionPhase: phases.transitionPhase,
    callbacks: deps.callbacks,
    resumeAnimations: playback.resumeAnimations,
    deckCount: DECK_COUNT,
    cutPileCount: CUT_PILE_COUNT,
    autoRevealDelayMs: AUTO_REVEAL_DELAY_MS,
  }))

  /* ── Local layout helpers ─────────────────────────────────────────── */

  function updateLayout() {
    const layout = layoutApi.getSceneLayout('draw_stage')
    animState.setDrawCardSizes(layout)
    gsap.killTweensOf(animState.draws)
    animState.draws.forEach((draw, index) => {
      if (index >= layout.cards.length) return
      draw.x = layout.cards[index].x
      draw.y = layout.cards[index].y
    })
    animState.refreshDraws()
  }

  function openAnswer() {
    if (showResults.value) return
    showResults.value = true
  }

  /* ── Compose public API ───────────────────────────────────────────── */

  return composeControllerApi({
    animState,
    playback,
    presentation,
    phases,
    lifecycle,
    getSceneLayout: layoutApi.getSceneLayout,
    refs: { showResults, entryAnimationComplete, cardsLanded },
    constants: {
      deckCount: DECK_COUNT,
      shuffleHalfCount: SHUFFLE_HALF_COUNT,
      cutPileCount: CUT_PILE_COUNT,
      cardsPerPile: CARDS_PER_PILE,
    },
    updateLayout,
    openAnswer,
  })
}
