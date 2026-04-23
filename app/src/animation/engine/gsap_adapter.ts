/**
 * Name: animation/engine/gsap_adapter
 * Purpose: collect all GSAP animation targets into a flat array.
 * Reason: provide a single adapter function for GSAP to operate on all tweenable state objects.
 */

import type { AnimationState } from './animation_state'

export function getAllTargets(state: AnimationState): unknown[] {
  return [
    state._bg,
    state._stage,
    state._header,
    state._footer,
    state._deckCtn,
    ...state._initials,
    ...state._lefts,
    ...state._rights,
    ...state._piles,
    ...state._draws,
    ...state._inners,
  ]
}
