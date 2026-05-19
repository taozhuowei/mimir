/**
 * Name: core/store/slices/deck
 * Purpose: state-slice factory holding the tarot card deck loaded from the
 *          backend. Composed by the `tarot` Pinia store — this module is a
 *          pure factory, not a store itself.
 * Reason: separates deck data concerns from divination flow and answer state.
 */

import { ref } from 'vue'
import { fetchAllCards } from '../../api/cards'
import type { TarotCardInfo } from '../../api/types'

export function createDeckState() {
  const allCards = ref<TarotCardInfo[]>([])
  const isCardsLoading = ref(false)
  const cardsLoadError = ref<string | null>(null)

  /** Call once at app startup to load all 78 cards from backend */
  async function loadCards(): Promise<void> {
    cardsLoadError.value = null
    if (allCards.value.length > 0 || isCardsLoading.value) return
    isCardsLoading.value = true
    try {
      allCards.value = await fetchAllCards()
    } catch (err) {
      cardsLoadError.value = err instanceof Error ? err.message : 'Failed to load card data'
    } finally {
      isCardsLoading.value = false
    }
  }

  return {
    allCards,
    isCardsLoading,
    cardsLoadError,
    loadCards,
  }
}
