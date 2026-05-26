/**
 * Name: core/store/slices/flow
 * Purpose: state-slice factory managing application-level divination flow
 *          (see docs/state.md 应用级流程). DDD-aligned: the value type
 *          is `Flow` and represents the application's flow state; divination
 *          internal animation phases (shuffling / cutting / drawing /
 *          revealing) are a separate concept tracked by the overlay
 *          controller as `OverlayPhase`.
 * Data flow: flow transitions and drawn cards flow in (from orchestrator
 *           and animation pipeline); read by overlay components and stores.
 */

import { computed, ref } from 'vue'
import type { DrawnResult } from '../../api/types'
import type { createAnswerState } from './answer'

export type Flow = 'idle' | 'divination' | 'answer'

export function createFlowState(answer: ReturnType<typeof createAnswerState>) {
  const flow = ref<Flow>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  const currentQuestion = ref('')

  const isIdle = computed(() => flow.value === 'idle')
  const isAnimating = computed(() => flow.value === 'divination')
  const isResultVisible = computed(() =>
    flow.value === 'answer' && answer.answerResult.value !== null,
  )

  function startDivination(question: string) {
    currentQuestion.value = question
    flow.value = 'divination'
    drawnCards.value = []
    answer.reset()
  }

  function setFlow(nextFlow: Flow) {
    flow.value = nextFlow
  }

  /**
   * Promote the application flow to `answer` once the reading payload has
   * settled. Answer is the terminal flow state — the inline answer zone
   * and the action area mount together; there is no separate decision
   * stage anymore (see docs/state.md).
   */
  function enterAnswer() {
    flow.value = 'answer'
  }

  function reset() {
    flow.value = 'idle'
    drawnCards.value = []
    currentQuestion.value = ''
    answer.reset()
  }

  return {
    flow,
    drawnCards,
    currentQuestion,
    isIdle,
    isAnimating,
    isResultVisible,
    startDivination,
    setFlow,
    enterAnswer,
    reset,
  }
}
