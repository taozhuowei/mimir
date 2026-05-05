/**
 * Name: composables/play/types
 * Purpose: shared internal types for the use_play_deck_animation
 *          composable and its extracted sub-controllers (fan_controller,
 *          divination_rig, click_handler).
 * Reason: P3-2 split — the main composable grew to 387 lines combining
 *          three independently-testable sub-systems (fan loop, divination
 *          rig start/teardown, click guard). Each lives in its own
 *          module under composables/play/; they share the runtime
 *          container shape defined here so the main file does not have
 *          to re-export it across module boundaries.
 * Data flow: pure type definitions — no runtime side-effects.
 */

import type { Ref } from 'vue'
import type { gsap } from 'gsap'

/**
 * Internal mutable state container for the play-deck animation. Holders
 * wrap primitive values that mutate inside GSAP callbacks / lifecycle
 * hooks without losing reference identity.
 *
 * Note: the `cards` array is dedicated to the fan stack — it MUST NOT
 * be reused with animationController.cardElements. The fan stack is a
 * 12-card visual decoration; the divination rig has its own initials/
 * lefts/rights/piles/draws targets and reuses different DOM nodes.
 * Sharing the proxy array would cause GSAP target collisions when the
 * watcher flips phase mid-animation.
 */
export interface PlayDeckRuntime {
  cardWidth: Ref<number>
  cardHeight: Ref<number>
  cardsStyle: Ref<Record<string, string>[]>
  hintOpacity: Ref<number>
  isStartingDivination: Ref<boolean>
  cards: { x: number; y: number; rotation: number; scale: number }[]
  hintState: { opacity: number }
  timelineHolder: { value: gsap.core.Timeline | null }
  animatingHolder: { value: boolean }
  lockTimerHolder: { value: ReturnType<typeof setTimeout> | null }
}

/** Reactive surface for the fan-loop sub-system. */
export interface FanController {
  flushCardsStyle: () => void
  resetCardsToStack: () => void
  killFanTimeline: () => void
  startFanLoop: () => void
}

/** Reactive surface for the divination-rig sub-system. */
export interface DivinationRig {
  start: () => void
  tearDown: () => void
  detachResize: () => void
}
