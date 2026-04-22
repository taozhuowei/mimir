/**
 * Divination flow state management (Pinia Store)
 * Manages the full deck (loaded from API), current question, drawn cards, reading result, and flow phases.
 * Card drawing (random selection) happens client-side; interpretation (scoring) is done by backend API.
 *
 * Architecture: this store is a facade that composes deck state, reading state, and divination flow.
 * Data domains are delegated to createDeckState() and createReadingState() for modularity;
 * the facade preserves the original interface so callers do not need to change.
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { drawCards as drawCardsUtil, type DrawnResult, type ReadingResult, type TarotCardInfo } from '../utils/tarotReading'
import { getSpreadCardCount, type SpreadKind } from '../core/layout/spread_registry'
import { createDeckState } from './deck'
import { createReadingState } from './reading'

// Spread kind is fixed to single_card. Extension point: make this reactive when
// multi-spread selection UI is reintroduced.
const ACTIVE_SPREAD_KIND: SpreadKind = 'single_card'

// Divination flow phases
export type DivinationPhase = 'idle' | 'shuffling' | 'cutting' | 'drawing' | 'revealing' | 'result'

export const useTarotStore = defineStore('tarot', () => {
  // ── Delegated data domains ──
  const deck = createDeckState()
  const reading = createReadingState()

  // ── Divination flow state ──
  const phase = ref<DivinationPhase>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  const currentQuestion = ref('')

  // Spread kind is fixed; use computed for extensibility when multi-spread is reintroduced
  const spreadKind = computed<SpreadKind>(() => ACTIVE_SPREAD_KIND)
  const cardCount = computed(() => getSpreadCardCount(spreadKind.value))

  const isIdle = computed(() => phase.value === 'idle')
  const isAnimating = computed(() => ['shuffling', 'cutting', 'drawing', 'revealing'].includes(phase.value))
  const isResultVisible = computed(() => phase.value === 'result' && reading.readingResult.value !== null)

  // ── Flow actions ──
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

  /**
   * Synchronous local draw: randomly select cards from the deck.
   * This is immediate and suitable for triggering animations.
   * Use startReadingRequest() to fetch the interpretation separately.
   */
  function drawCards(): DrawnResult[] {
    reading.invalidateReadingRequest()
    const drawn = drawCardsUtil(deck.allCards.value, cardCount.value)
    drawnCards.value = drawn
    reading.readingResult.value = null
    reading.readingError.value = null
    return drawn
  }

  /**
   * Start the async reading request. Returns a promise that resolves when
   * the reading result arrives. Stale responses are automatically ignored.
   */
  async function startReadingRequest(): Promise<ReadingResult | null> {
    return reading.startReadingRequest(drawnCards.value, spreadKind.value)
  }

  function waitForReadingResult(): Promise<ReadingResult | null> {
    return reading.waitForReadingResult()
  }

  function getReadingResult(): ReadingResult | null {
    return reading.readingResult.value
  }

  function reset() {
    phase.value = 'idle'
    drawnCards.value = []
    currentQuestion.value = ''
    reading.reset()
  }

  return {
    // Flow
    phase,
    drawnCards,
    currentQuestion,
    spreadKind,
    cardCount,
    isAnimating,
    isIdle,
    isResultVisible,

    // Deck (delegated)
    allCards: deck.allCards,
    isCardsLoading: deck.isCardsLoading,
    cardsLoadError: deck.cardsLoadError,
    loadCards: deck.loadCards,

    // Reading (delegated)
    isReadingLoading: reading.isReadingLoading,
    readingResult: reading.readingResult,
    readingError: reading.readingError,
    startReadingRequest,
    waitForReadingResult,

    // Actions
    startDivination,
    setPhase,
    revealResult,
    drawCards,
    getReadingResult,
    reset,
  }
})
