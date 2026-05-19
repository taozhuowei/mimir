/**
 * Name: core/store/slices/flow
 * Purpose: state-slice factory managing application-level divination flow
 *          state (phase, question, drawn cards). Composed by the `tarot`
 *          Pinia store — this module is a pure factory, not a store itself.
 * Reason: separates flow concerns from deck and answer state. The flow
 *         layer now models the application-level 4 stages (idle /
 *         divination / answer / decision) per docs/prd/state.md（流程阶段）; the in-divination
 *         animation phases (shuffling / cutting / drawing / revealing) are
 *         a separate concept tracked by the overlay controller and progress
 *         icons, and are not represented here. Spread metadata (kind, card
 *         count) is no longer owned here; the backend protocol implies
 *         `single_card` for now and consumers that need a count derive it
 *         locally until the layout layer is refactored in the next phase.
 * Data flow: phase transitions and drawn cards flow in (from orchestrator
 *           and animation pipeline); read by overlay components and stores.
 */

import { computed, ref } from 'vue'
import type { DrawnResult } from '../../api/types'
import type { createAnswerState } from './answer'

export type DivinationPhase = 'idle' | 'divination' | 'answer' | 'decision'

export function createFlowState(answer: ReturnType<typeof createAnswerState>) {
  const phase = ref<DivinationPhase>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  const currentQuestion = ref('')

  const isIdle = computed(() => phase.value === 'idle')
  const isAnimating = computed(() => phase.value === 'divination')
  // Both answer and decision stages keep the inline answer zone on screen
  // (only the action area visibility differs). The name `isResultVisible`
  // is retained as the public-facing flag.
  const isResultVisible = computed(() =>
    (phase.value === 'answer' || phase.value === 'decision') && answer.answerResult.value !== null,
  )

  function startDivination(question: string) {
    currentQuestion.value = question
    phase.value = 'divination'
    drawnCards.value = []
    answer.reset()
  }

  function setPhase(nextPhase: DivinationPhase) {
    phase.value = nextPhase
  }

  function revealResult() {
    phase.value = 'answer'
  }

  /**
   * Promote the application-level stage from `answer` to `decision` so the
   * action area can fade in. Per docs/prd/state.md（流程阶段;2.6.1 应用级流程） / docs/prd/animation.md（视图过渡动画） stage 3, the answer view
   * calls this once the answer-reveal animation settles (AnswerInscription
   * emits `answerRevealed` → use_main_stage `handleAnswerRevealed`); until
   * then the action area remains hidden.
   */
  function enterDecision() {
    phase.value = 'decision'
  }

  function reset() {
    phase.value = 'idle'
    drawnCards.value = []
    currentQuestion.value = ''
    answer.reset()
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
    enterDecision,
    reset,
  }
}
