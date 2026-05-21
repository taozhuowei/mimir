/**
 * Name: flows/base/composables/use_play_deck_animation
 * Purpose: drives the single persistent Deck stage-content (idle fan loop +
 *          divination rig). Holds the runtime container, lifecycle wiring,
 *          and the flow-driven state-machine watch; the fan loop, the
 *          divination rig start/teardown, and the click guard each live in
 *          their own sibling composable.
 *
 * Data flow:
 *   - injected `flow` (Ref<Flow>) watched to switch between fan loop ('idle')
 *     and the divination pipeline (any non-idle flow).
 *   - tarotStore consulted for the click guard (already animating? skip).
 *   - injected animationController owns the divination GSAP rig — this
 *     composable kicks it off on idle→divination via `animCtrl.start()`,
 *     and tears it down on flow→idle reset.
 *   - flows/idle/deck_card_size (`resolveDeckCardSize`) gives the fan
 *     stack the same card size as the draw card so idle→shuffle keeps
 *     stable visual scale.
 */

import { computed, inject, onMounted, onUnmounted, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { gsap } from 'gsap'
import type { UseAnimationControllerReturn } from '../../divination/composables/use_animation_controller'
import type { Flow } from '../../../core/store/slices/flow'
import { DECK_SIZE, createPlayDeckRuntime } from '../../idle/composables/deck_runtime'
import type { PlayDeckRuntime } from '../../idle/composables/deck_runtime'
import { resolveDeckCardSize } from '../../idle/composables/deck_card_size'
import { runEntranceHint } from '../../idle/composables/entrance_hint'
import { createFanController } from '../../idle/composables/fan_controller'
import type { FanController } from '../../idle/composables/fan_controller'
import { buildClickHandler } from '../../idle/composables/deck_click_guard'
import { createDivinationRig } from '../../divination/composables/rig_lifecycle'
import type { DivinationRig } from '../../divination/composables/rig_lifecycle'

/** Reactive surface returned to Deck.vue. */
export interface PlayDeckAnimation {
  /** Number of fan-stack cards (template v-for). */
  deckSize: number
  /** Fan stack container width/height (matches draw card size). */
  deckContainerStyle: ComputedRef<{ width: string; height: string }>
  /** Per-card transform inline styles for the fan stack. */
  cardsStyle: Ref<Record<string, string>[]>
  /** Touch-hint opacity (0 → 0.6 entrance fade, idle only). */
  hintOpacity: Ref<number>
  /** Click handler: starts divination on idle taps; no-op otherwise. */
  handleClick: () => void
}

/** Dependencies the SFC injects. */
export interface PlayDeckAnimationDeps {
  /**
   * Called the moment a valid idle-flow tap is registered. The parent
   * promotes the application flow synchronously so the watch below
   * sees it and kicks off the divination rig.
   */
  onTriggerDivination: () => void
}

/**
 * Build the flow-driven state-machine watcher.
 *
 * Flow transitions:
 *   idle             → fan loop running, hint visible
 *   divination       → fan killed (cards snapped to rest), divination
 *                       rig kicked off the FIRST time we leave idle
 *   answer (terminal)→ divination rig kept alive; managed by the
 *                       animationController's pipeline.
 *   idle (re-entry)  → divination rig torn down, fan loop restarted
 */
function watchFlowStateMachine(
  rt: PlayDeckRuntime,
  flow: Ref<Flow>,
  fan: FanController,
  rig: DivinationRig,
): void {
  watch(flow, (next, prev) => {
    if (next === 'idle' && prev !== 'idle' && prev !== undefined) {
      rig.tearDown()
      runEntranceHint(rt.hintOpacity, rt.hintState)
      fan.startFanLoop()
      return
    }
    if (prev === 'idle' && next !== 'idle') {
      // Force-flush cards to rest so the visual hand-off into shuffle
      // has no micro-jump (GSAP target arrays are about to change).
      fan.killFanTimeline()
      fan.resetCardsToStack()
      rig.start()
    }
    // divination → answer keeps the rig alive (animationController owns it).
  })
}

/** Build the full PlayDeck animation surface for Deck.vue. */
export function usePlayDeckAnimation(deps: PlayDeckAnimationDeps): PlayDeckAnimation {
  const rt = createPlayDeckRuntime()
  const animCtrl = inject<UseAnimationControllerReturn>('animationController')
  if (!animCtrl) {
    throw new Error('[use_play_deck_animation] animationController not provided')
  }
  const flow = inject<Ref<Flow>>('flow')
  if (!flow) {
    throw new Error('[use_play_deck_animation] flow not provided')
  }

  const deckContainerStyle = computed(() => ({
    width: `${rt.cardWidth.value}px`,
    height: `${rt.cardHeight.value}px`,
  }))

  function resolveCardSize(): void {
    const resolved = resolveDeckCardSize()
    rt.cardWidth.value = resolved.cardWidth
    rt.cardHeight.value = resolved.cardHeight
  }

  const fan = createFanController(rt)
  const rig = createDivinationRig(animCtrl)
  const handleResize = (): void => { resolveCardSize() }

  onMounted(() => {
    resolveCardSize()
    uni.onWindowResize(handleResize)
    if (flow.value === 'idle') {
      fan.startFanLoop()
      runEntranceHint(rt.hintOpacity, rt.hintState)
    }
  })

  watchFlowStateMachine(rt, flow, fan, rig)

  const handleClick = buildClickHandler(rt, flow, deps.onTriggerDivination)

  onUnmounted(() => {
    uni.offWindowResize(handleResize)
    rig.detachResize()
    fan.killFanTimeline()
    if (rt.lockTimerHolder.value !== null) {
      clearTimeout(rt.lockTimerHolder.value)
      rt.lockTimerHolder.value = null
    }
    gsap.killTweensOf(rt.hintState)
    // The Deck stays mounted for the whole route, so onUnmounted only
    // fires on full app teardown (route swap / fallback). Tear the
    // divination rig down too if it was running.
    if (flow.value !== 'idle') {
      rig.tearDown()
    }
  })

  return {
    deckSize: DECK_SIZE,
    deckContainerStyle,
    cardsStyle: rt.cardsStyle,
    hintOpacity: rt.hintOpacity,
    handleClick,
  }
}
