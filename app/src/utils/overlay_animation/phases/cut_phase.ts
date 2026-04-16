/**
 * Name: cut_phase
 * Purpose: pure cut animation logic.
 * Reason: one phase per file; no cross-phase orchestration.
 * Data flow: pile rest positions and lead/trail offsets flow in; GSAP timeline flows out.
 */

import type { CutAxis } from '../../overlay_layout/motion_metrics'
import type { CenterCardState } from '../types'

export interface CutPhaseConfig {
  pileCount: number
  pileSpacing: number
  axis: CutAxis
  cutLeadingOffset: { x: number; y: number }
  cutTrailingOffset: { x: number; y: number }
}

/**
 * Allocate enough pile state slots up to `maxPiles`.
 */
export function createCutInitialStates(maxPiles: number = 8): {
  piles: CenterCardState[]
} {
  const piles: CenterCardState[] = Array.from({ length: maxPiles }, (_, i) => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    opacity: 0,
    zIndex: 10 + i,
  }))
  return { piles }
}
