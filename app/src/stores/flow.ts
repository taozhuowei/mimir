/**
 * Name: flow state module
 * Purpose: pure function module managing divination flow state (phase,
 *          question, drawn cards).
 * Reason: separates flow concerns from deck and reading state. Spread
 *         metadata (kind, card count) is no longer owned here; the backend
 *         protocol implies `single_card` for now and consumers that need
 *         a count derive it locally until the layout layer is refactored
 *         in the next phase.
 * Data flow: phase transitions and drawn cards flow in (from orchestrator
 *           and animation pipeline); read by overlay components and stores.
 */

import { computed, ref } from 'vue'
import type { DrawnResult } from '../api/types'
import type { createReadingState } from './reading'

export type DivinationPhase = 'idle' | 'shuffling' | 'cutting' | 'drawing' | 'revealing' | 'result'

export function createFlowState(reading: ReturnType<typeof createReadingState>) {
  const phase = ref<DivinationPhase>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  const currentQuestion = ref('')

  const isIdle = computed(() => phase.value === 'idle')
  const isAnimating = computed(() => ['shuffling', 'cutting', 'drawing', 'revealing'].includes(phase.value))
  const isResultVisible = computed(() => phase.value === 'result' && reading.readingResult.value !== null)

  function startDivination(question: string) {
    currentQuestion.value = question
    phase.value = 'shuffling'
    drawnCards.value = []
    reading.reset()
  }

  function setPhase(nextPhase: DivinationPhase) {
    phase.value = nextPhase
  }

  function revealResult() {
    phase.value = 'result'
  }

  function reset() {
    phase.value = 'idle'
    drawnCards.value = []
    currentQuestion.value = ''
    reading.reset()
  }

  return {
    phase,
    drawnCards,
    currentQuestion,
    isIdle,
    isAnimating,
    isResultVisible,
    startDivination,
    setPhase,
    revealResult,
    reset,
  }
}
