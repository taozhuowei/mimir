/**
 * Name: flow state module
 * Purpose: pure function module managing divination flow state (phase, question, drawn cards).
 * Reason: separates flow concerns from deck and reading state.
 */

import { computed, ref } from 'vue'
import type { DrawnResult } from '../utils/tarot_reading'
import { getSpreadCardCount, type SpreadKind } from '../core/layout/spread_registry'
import type { createReadingState } from './reading'

const ACTIVE_SPREAD_KIND: SpreadKind = 'single_card'

export type DivinationPhase = 'idle' | 'shuffling' | 'cutting' | 'drawing' | 'revealing' | 'result'

export function createFlowState(reading: ReturnType<typeof createReadingState>) {
  const phase = ref<DivinationPhase>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  const currentQuestion = ref('')

  const spreadKind = computed<SpreadKind>(() => ACTIVE_SPREAD_KIND)
  const cardCount = computed(() => getSpreadCardCount(spreadKind.value))

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
    spreadKind,
    cardCount,
    isIdle,
    isAnimating,
    isResultVisible,
    startDivination,
    setPhase,
    revealResult,
    reset,
  }
}
