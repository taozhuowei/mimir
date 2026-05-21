/** Divination flow state management (Pinia Store) — facade composing deck + answer + flow */

import { defineStore } from 'pinia'
import type { DrawnResult } from '../api/types'
import { createDeckState } from './slices/deck'
import { createAnswerState } from './slices/answer'
import { createFlowState } from './slices/flow'

export type { Flow } from './slices/flow'

export const useTarotStore = defineStore('tarot', () => {
  const deck = createDeckState()
  const answer = createAnswerState()
  const flow = createFlowState(answer)

  /**
   * Externally-owned write path for the drawn cards. The answer
   * orchestrator calls this after a successful `/api/v1/divinations`
   * response; the deck and tarot stores no longer perform any local
   * shuffling or drawing.
   */
  function setDrawnCards(drawn: DrawnResult[]) {
    flow.drawnCards.value = drawn
  }

  return {
    // Flow
    flow: flow.flow,
    drawnCards: flow.drawnCards,
    currentQuestion: flow.currentQuestion,
    isAnimating: flow.isAnimating,
    isIdle: flow.isIdle,
    isResultVisible: flow.isResultVisible,

    // Deck
    allCards: deck.allCards,
    isCardsLoading: deck.isCardsLoading,
    cardsLoadError: deck.cardsLoadError,
    loadCards: deck.loadCards,

    // Answer
    isAnswerLoading: answer.isAnswerLoading,
    answerResult: answer.answerResult,
    answerError: answer.answerError,
    waitForAnswerResult: answer.waitForAnswerResult,
    getAnswerResult: () => answer.answerResult.value,

    // Actions
    startDivination: flow.startDivination,
    setFlow: flow.setFlow,
    enterAnswer: flow.enterAnswer,
    setDrawnCards,
    reset: flow.reset,
  }
})
