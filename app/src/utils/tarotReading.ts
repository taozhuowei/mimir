/**
 * Tarot card type definitions and client-side drawing logic.
 * Interpretation logic (scoring, generateReading) has moved to the backend.
 * This file retains only:
 *   - Shared TypeScript interfaces (used by store, components, API layer)
 *   - drawThreeCards — random card selection and position assignment
 */

export interface TarotCardMeaning {
  keywords: string[]
  meaning: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export interface TarotCardInfo {
  id: string
  name: string
  nameEn: string
  number: number
  type: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  image: string       // server-resolved URL, populated by GET /api/v1/cards
  upright: TarotCardMeaning
  reversed: TarotCardMeaning
}

export interface DrawnResult {
  card: TarotCardInfo
  position: 'upright' | 'reversed'
}

export interface ReadingResult {
  result: 'yes' | 'no'
  score: number
  cardDetails: Array<{
    card: TarotCardInfo
    position: 'upright' | 'reversed'
    meaning: string
  }>
}

/**
 * Draw 3 cards from the full deck using Fisher-Yates shuffle and random position.
 * Card data must be pre-loaded from the backend via fetchAllCards().
 * Interpretation of the drawn cards is done by POST /api/v1/readings.
 */
export function drawThreeCards(all_cards: TarotCardInfo[]): DrawnResult[] {
  const shuffled = [...all_cards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(card => ({
    card,
    position: Math.random() > 0.5 ? 'upright' : 'reversed'
  }))
}
