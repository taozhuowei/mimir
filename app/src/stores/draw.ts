/**
 * Name: draw action module
 * Purpose: pure function module for synchronous card drawing.
 * Reason: separates draw logic from flow state and deck state.
 */

import type { ComputedRef } from 'vue'
import { drawCards as drawCardsUtil, type DrawnResult } from '../utils/tarot_reading'
import type { createDeckState } from './deck'
import type { createReadingState } from './reading'

export function createDrawAction(
  deck: ReturnType<typeof createDeckState>,
  cardCount: ComputedRef<number>,
  reading: ReturnType<typeof createReadingState>,
) {
  function drawCards(): DrawnResult[] {
    reading.invalidateReadingRequest()
    const drawn = drawCardsUtil(deck.allCards.value, cardCount.value)
    reading.readingResult.value = null
    reading.readingError.value = null
    return drawn
  }

  return { drawCards }
}
