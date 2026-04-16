/**
 * Name: draw_phase
 * Purpose: pure draw animation logic consuming resolved motion/layout bounds.
 * Reason: no animation step can leave the safe area.
 * Data flow: target positions and layout metrics flow in; GSAP timeline flows out.
 */

import type { CenterCardState, InnerState } from '../types'

export interface DrawPhaseConfig {
  cardCount: number
  cardHeight: number
  stageHeight: number
  liftY: number
  targetX: number[]
  targetY: number[]
  autoRevealDelayMs: number
}

/**
 * Create initial draw card states.
 */
export function createDrawInitialStates(maxCards: number): {
  draws: CenterCardState[]
  inners: InnerState[]
} {
  const draws: CenterCardState[] = Array.from({ length: maxCards }, (_, i) => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    opacity: 0,
    zIndex: 20 - i,
  }))

  const inners: InnerState[] = Array.from({ length: maxCards }, () => ({ rotationY: 0 }))

  return { draws, inners }
}
