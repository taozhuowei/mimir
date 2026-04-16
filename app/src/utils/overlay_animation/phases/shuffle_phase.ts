/**
 * Name: shuffle_phase
 * Purpose: pure shuffle animation logic.
 * Reason: one phase per file; no cross-phase orchestration.
 * Data flow: animation states + spread config flow in; GSAP timeline flows out.
 */

import type { CardState } from '../types'

export interface ShufflePhaseConfig {
  spreadX: number
}

/**
 * Create initial state for shuffle animation groups.
 */
export function createShuffleInitialStates(
  deckCount: number = 12,
  halfCount: number = Math.max(1, Math.floor(deckCount / 2)),
): {
  initials: CardState[]
  lefts: CardState[]
  rights: CardState[]
} {
  const initials: CardState[] = Array.from({ length: deckCount }, (_, i) => ({
    x: 0,
    y: -(i * 0.8),
    rotation: 0,
    scale: 1,
    scaleY: 1,
    opacity: 1,
  }))

  const lefts: CardState[] = Array.from({ length: halfCount }, () => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    scaleY: 1,
    opacity: 0,
  }))

  const rights: CardState[] = Array.from({ length: halfCount }, () => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    scaleY: 1,
    opacity: 0,
  }))

  return { initials, lefts, rights }
}
