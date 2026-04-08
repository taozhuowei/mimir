/**
 * Cards API
 * Fetches all 78 tarot cards from the backend.
 * Image URLs are server-constructed — no path building on the frontend.
 */

import { request } from './client'
import type { TarotCardInfo } from '../utils/tarotReading'

interface CardsResponse {
  cards: TarotCardInfo[]
}

export function fetchAllCards(): Promise<TarotCardInfo[]> {
  return request<CardsResponse>('/api/v1/cards').then(res => res.cards)
}
