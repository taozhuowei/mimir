/**
 * Name: flows/divination/composables/progress_model
 * Purpose: pure state model for overlay progress tracking.
 * Reason: keep progress state independent from rendering and animation orchestration.
 * Data flow: phase changes flow in; progress state flows out.
 */

import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'
import { getPhaseIndex, getPhaseSteps } from './phase_registry'

export interface ProgressState {
  currentPhase: OverlayPhase
  currentPhaseIndex: number
  totalPhases: number
  progressRatio: number
  isComplete: boolean
}

export interface ProgressModel {
  state: ProgressState
  transitionTo(phase: OverlayPhase): void
  complete(): void
  reset(): void
}

export function createProgressModel(initialPhase: OverlayPhase = 'shuffling'): ProgressModel {
  const totalPhases = getPhaseSteps().length

  function calculateState(phase: OverlayPhase): ProgressState {
    const currentPhaseIndex = getPhaseIndex(phase)
    return {
      currentPhase: phase,
      currentPhaseIndex,
      totalPhases,
      progressRatio: (currentPhaseIndex + 1) / totalPhases,
      isComplete: currentPhaseIndex >= totalPhases - 1,
    }
  }

  let state: ProgressState = calculateState(initialPhase)

  return {
    get state() {
      return state
    },
    transitionTo(phase: OverlayPhase) {
      state = calculateState(phase)
    },
    complete() {
      state = {
        ...state,
        progressRatio: 1,
        isComplete: true,
      }
    },
    reset() {
      state = calculateState('shuffling')
    },
  }
}
