/** Divination flow state management (Pinia Store) — facade composing deck + reading + flow + draw */

import { defineStore } from 'pinia'
import { createDeckState } from './deck'
import { createReadingState } from './reading'
import { createFlowState } from './flow'
import { createDrawAction } from './draw'

export type { DivinationPhase } from './flow'

export const useTarotStore = defineStore('tarot', () => {
  const deck = createDeckState()
  const reading = createReadingState()
  const flow = createFlowState(reading)
  const draw = createDrawAction(deck, flow.cardCount, reading)

  function drawCards() {
    const drawn = draw.drawCards()
    flow.drawnCards.value = drawn
    return drawn
  }

  async function startReadingRequest() {
    return reading.startReadingRequest(flow.drawnCards.value, flow.spreadKind.value)
  }

  return {
    // Flow
    phase: flow.phase,
    drawnCards: flow.drawnCards,
    currentQuestion: flow.currentQuestion,
    spreadKind: flow.spreadKind,
    cardCount: flow.cardCount,
    isAnimating: flow.isAnimating,
    isIdle: flow.isIdle,
    isResultVisible: flow.isResultVisible,

    // Deck
    allCards: deck.allCards,
    isCardsLoading: deck.isCardsLoading,
    cardsLoadError: deck.cardsLoadError,
    loadCards: deck.loadCards,

    // Reading
    isReadingLoading: reading.isReadingLoading,
    readingResult: reading.readingResult,
    readingError: reading.readingError,
    startReadingRequest,
    waitForReadingResult: reading.waitForReadingResult,
    getReadingResult: () => reading.readingResult.value,
    // Actions
    startDivination: flow.startDivination,
    setPhase: flow.setPhase,
    revealResult: flow.revealResult,
    drawCards,
    reset: flow.reset,
  }
})
