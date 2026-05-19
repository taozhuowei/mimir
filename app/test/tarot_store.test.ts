/**
 * Tarot store unit tests (B2 protocol).
 *
 * Post-merge the store no longer owns drawing logic — the backend's single
 * `POST /api/v1/divinations` returns `{ drawn, reading }` and the orchestrator
 * writes both into the store. The store therefore only exposes:
 *   - `setDrawnCards(drawn)` for the orchestrator to push drawn cards in
 *   - `answerResult` as a writable ref (for tests / direct consumers)
 *   - phase transition primitives (`startDivination`, `setPhase`,
 *     `revealResult`, `reset`)
 *
 * These tests cover the surface that remains: phase transitions, drawn-card
 * injection, reading result wiring, and the deck-load error ref.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTarotStore } from '../src/core/store/tarot'
import type { DrawnResult, AnswerResult, TarotCardInfo } from '../src/core/utils/tarot_answer_types_shim'

// Helper to create minimal valid TarotCardInfo (face data only).
function makeCard(id: string): TarotCardInfo {
  return {
    id,
    name: id,
    nameEn: id,
    number: 0,
    type: 'major',
    image: `http://localhost:4124/static/themes/golden_dawn/tarot/major/major_arcana_00_${id}.jpeg`,
  }
}

function makeDrawn(id = 'card_a'): DrawnResult[] {
  return [{ card: makeCard(id), position: 'upright' }]
}

function makeAnswerResult(drawn: DrawnResult[]): AnswerResult {
  return {
    cardDetails: drawn.map(d => ({
      card: d.card,
      position: d.position,
      answer: {
        quote: `${d.card.id} quote`,
        translation: `${d.card.id} 译文`,
        source: `${d.card.id} 出处`,
      },
    })),
  }
}

describe('tarot store - drawn cards and reading flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('setDrawnCards', () => {
    it('writes drawn cards into the store', () => {
      const store = useTarotStore()
      const drawn = makeDrawn('the_fool')

      store.setDrawnCards(drawn)

      expect(store.drawnCards).toHaveLength(1)
      expect(store.drawnCards).toEqual(drawn)
    })

    it('replaces previous drawn cards on subsequent calls', () => {
      const store = useTarotStore()

      store.setDrawnCards(makeDrawn('first'))
      expect(store.drawnCards[0].card.id).toBe('first')

      store.setDrawnCards(makeDrawn('second'))
      expect(store.drawnCards).toHaveLength(1)
      expect(store.drawnCards[0].card.id).toBe('second')
    })

    it('accepts an empty array (used for reset-style flows)', () => {
      const store = useTarotStore()

      store.setDrawnCards(makeDrawn())
      store.setDrawnCards([])

      expect(store.drawnCards).toHaveLength(0)
    })
  })

  describe('answerResult ref', () => {
    it('is null by default and writable for direct injection', () => {
      const store = useTarotStore()
      expect(store.answerResult).toBeNull()

      const drawn = makeDrawn()
      store.setDrawnCards(drawn)
      const result = makeAnswerResult(drawn)
      // The reading ref is exposed as a writable ref so tests / direct
      // consumers can drive UI without going through the orchestrator.
      store.answerResult = result

      expect(store.answerResult).toEqual(result)
    })

    it('reset clears answerResult', () => {
      const store = useTarotStore()
      const drawn = makeDrawn()
      store.setDrawnCards(drawn)
      store.answerResult = makeAnswerResult(drawn)

      store.reset()

      expect(store.answerResult).toBeNull()
    })
  })

  describe('phase transitions', () => {
    it('transitions through phases correctly', () => {
      const store = useTarotStore()

      expect(store.phase).toBe('idle')
      expect(store.isIdle).toBe(true)
      expect(store.isAnimating).toBe(false)

      store.startDivination('Test question')
      expect(store.phase).toBe('divination')
      expect(store.isIdle).toBe(false)
      expect(store.isAnimating).toBe(true)
      expect(store.currentQuestion).toBe('Test question')

      store.revealResult()
      expect(store.phase).toBe('answer')
      // isResultVisible is false because answerResult is null (no result loaded yet)
      expect(store.isResultVisible).toBe(false)

      store.enterDecision()
      expect(store.phase).toBe('decision')
    })

    it('isResultVisible requires both phase=reading AND answerResult', () => {
      const store = useTarotStore()

      // Initially not visible
      expect(store.isResultVisible).toBe(false)

      // Just changing phase is not enough
      store.revealResult()
      expect(store.isResultVisible).toBe(false)

      // Need both phase='answer' AND answerResult
      const drawn = makeDrawn()
      store.setDrawnCards(drawn)
      store.answerResult = makeAnswerResult(drawn)

      expect(store.isResultVisible).toBe(true)
    })

    it('startDivination resets drawnCards and reading state', () => {
      const store = useTarotStore()
      const drawn = makeDrawn()
      store.setDrawnCards(drawn)
      store.answerResult = makeAnswerResult(drawn)

      store.startDivination('Fresh question')

      expect(store.phase).toBe('divination')
      expect(store.drawnCards).toHaveLength(0)
      expect(store.answerResult).toBeNull()
      expect(store.currentQuestion).toBe('Fresh question')
    })

    it('reset clears all state including phase, drawn cards, reading and question', () => {
      const store = useTarotStore()

      store.startDivination('Test question')
      store.setDrawnCards(makeDrawn())
      store.setPhase('revealing')
      store.answerResult = makeAnswerResult(store.drawnCards)

      store.reset()

      expect(store.phase).toBe('idle')
      expect(store.drawnCards).toHaveLength(0)
      expect(store.answerResult).toBeNull()
      expect(store.currentQuestion).toBe('')
      expect(store.isIdle).toBe(true)
    })
  })

  describe('deck state', () => {
    it('exposes cardsLoadError ref initialized to null', () => {
      const store = useTarotStore()
      expect(store.cardsLoadError).toBeNull()
    })

    it('exposes allCards ref initialized to empty array', () => {
      const store = useTarotStore()
      expect(store.allCards).toEqual([])
    })

    it('exposes isCardsLoading ref initialized to false', () => {
      const store = useTarotStore()
      expect(store.isCardsLoading).toBe(false)
    })
  })
})
