/**
 * Tarot Reading Service
 * Interprets drawn cards and produces a yes/no reading result.
 * Migrated from app/src/utils/tarotReading.ts — scoring logic lives here,
 * random card selection (drawThreeCards) stays on the frontend.
 */

import { getCardById, type TarotCard } from './card_loader'

export interface DrawnInput {
  cardId: string
  position: 'upright' | 'reversed'
}

export interface CardDetail {
  card: TarotCard
  position: 'upright' | 'reversed'
  meaning: string
}

export interface ReadingResult {
  result: 'positive' | 'negative'
  score: number
  cardDetails: CardDetail[]
}

// Base sentiment weights: positive = +3, negative = -3, neutral = 0
const SENTIMENT_BASE_WEIGHT: Record<string, number> = {
  positive: 3,
  negative: -3,
  neutral: 0
}

/**
 * Score a single drawn card.
 * Rules:
 *  - Base score from sentiment (+3/-3/0)
 *  - Position/sentiment alignment: matching → +2 or -2, mismatching → +1 or -1
 *  - Neutral cards: upright = +1, reversed = -1
 *  - Major Arcana: score × 1.3 (rounded)
 */
function getCardScore(card: TarotCard, position: 'upright' | 'reversed'): number {
  const meaning = position === 'upright' ? card.upright : card.reversed
  const sentiment = meaning.sentiment

  let score = SENTIMENT_BASE_WEIGHT[sentiment] ?? 0

  if (sentiment === 'neutral') {
    score = position === 'upright' ? 1 : -1
  } else {
    const position_sentiment = position === 'upright' ? card.upright.sentiment : card.reversed.sentiment
    if (position_sentiment === sentiment) {
      score += sentiment === 'positive' ? 2 : -2
    } else {
      score += sentiment === 'positive' ? -1 : 1
    }
  }

  if (card.type === 'major') {
    score = Math.round(score * 1.3)
  }

  return score
}

/**
 * Generate a reading from drawn card IDs + positions.
 * Total score > 0 → yes, < 0 → no. Tie-breaks by upright count.
 */
export function generateReading(inputs: DrawnInput[]): ReadingResult {
  const resolved = inputs.map(({ cardId, position }) => {
    const card = getCardById(cardId)
    if (!card) throw new Error(`Card not found: ${cardId}`)
    return { card, position }
  })

  const scores = resolved.map(({ card, position }) => getCardScore(card, position))
  let total_score = scores.reduce((sum, s) => sum + s, 0)

  if (total_score === 0) {
    const upright_count = resolved.filter(r => r.position === 'upright').length
    const reversed_count = resolved.filter(r => r.position === 'reversed').length
    total_score = upright_count >= reversed_count ? 1 : -1
  }

  return {
    result: total_score > 0 ? 'positive' : 'negative',
    score: total_score,
    cardDetails: resolved.map(({ card, position }) => ({
      card,
      position,
      meaning: position === 'upright' ? card.upright.meaning : card.reversed.meaning
    }))
  }
}
