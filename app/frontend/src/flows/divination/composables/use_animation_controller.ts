/**
 * Name: flows/divination/composables/use_animation_controller
 * Purpose: thin orchestrator — composes usePhases, usePlayback, usePresentation,
 *          useAnimationState, and useLifecycle into the animation controller public API.
 * Reason: isolates GSAP-dependent code so answer controller never touches animation internals.
 * Constraint: does NOT import any module under `answer/`.
 * Data flow: deps in → wires hooks via DI → exposes unified public API surface.
 */

import { ref } from 'vue'
import gsap from 'gsap'
import overlayConfig from '../../../config.json'
import { useAnimationState } from '../../base/composables/animations/use_animation_state'
import { useOverlayLayout } from '../../../core/sizing/overlay_layout/use_overlay_layout'
import { usePhases } from './use_phase_state'
import { usePlayback } from '../../base/composables/animations/use_playback'
import { usePresentation } from './use_presentation'
import { useLifecycle } from './use_lifecycle'
import { buildLifecycleDeps } from './build_lifecycle_deps'
import { composeControllerApi } from './compose_controller_api'
import { MAX_CARD_COUNT } from '../../base/composables/animations/animation_targets'
import { MAX_CUT_PILES } from './phase_entry_snap'
import type { UseAnimationControllerDeps, UseAnimationControllerReturn } from './use_animation_controller_types'

export type {
  UseAnimationControllerCallbacks,
  UseAnimationControllerDeps,
  UseAnimationControllerReturn,
} from './use_animation_controller_types'

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
