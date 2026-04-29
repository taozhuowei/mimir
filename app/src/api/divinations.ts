/**
 * Name: api/divinations
 * Purpose: single client-side entry point for the divination flow.
 * Reason: the backend now owns shuffling, drawing, and interpretation in
 *         one transaction (`POST /api/v1/divinations`). This module hides
 *         the protocol shape from callers — they hand in a spread kind,
 *         they receive a fully-resolved `Divination`.
 * Data flow: spread kind flows in -> server response flows out, with image
 *           URLs already wrapped by `resolveAssetUrl` so no caller has to
 *           remember that step.
 */

import { request, resolveAssetUrl } from './client'
import type {
  DivinationResponse,
  DrawnResult,
  ReadingCardDetail,
  ReadingResult,
  TarotCardInfo,
} from './types'

/**
 * Result of a complete divination: drawn cards (with images resolved) plus
 * the server's reading. Frontend animations consume `drawn`; the result
 * panel consumes `reading`.
 */
export interface Divination {
  spreadKind: 'single_card'
  drawn: DrawnResult[]
  reading: ReadingResult
}

/**
 * Hydrate a server-returned drawn entry into a full `DrawnResult`. We need
 * the user-facing card metadata (image, name, meanings) on the client, so
 * the reading we get back already carries the card object — we reuse it
 * here to avoid a second round-trip to `/api/v1/cards`.
 */
function hydrateDrawn(
  serverDrawn: DivinationResponse['drawn'],
  cardDetails: ReadingCardDetail[],
): DrawnResult[] {
  const card_by_id = new Map<string, TarotCardInfo>()
  for (const detail of cardDetails) {
    card_by_id.set(detail.card.id, {
      ...detail.card,
      image: resolveAssetUrl(detail.card.image),
    })
  }

  return serverDrawn.map(entry => {
    const card = card_by_id.get(entry.cardId)
    if (!card) {
      throw new Error(`Server returned drawn card '${entry.cardId}' but no matching detail`)
    }
    return { card, position: entry.position }
  })
}

/** Resolve image URLs inside a reading result. */
function hydrateReading(reading: ReadingResult): ReadingResult {
  return {
    ...reading,
    cardDetails: reading.cardDetails.map(detail => ({
      ...detail,
      card: { ...detail.card, image: resolveAssetUrl(detail.card.image) },
    })),
  }
}

/**
 * Run a divination. The default spread kind is `single_card`; callers may
 * pass another kind once additional spreads are wired into the backend.
 *
 * Named `requestDivination` rather than `performDivination` because the
 * server-side implementation already owns the latter name; this helper is
 * just a typed HTTP wrapper, so the verb reflects the round-trip.
 */
export async function requestDivination(
  spreadKind: 'single_card' = 'single_card',
): Promise<Divination> {
  const res = await request<DivinationResponse>('/api/v1/divinations', {
    method: 'POST',
    data: { spreadKind },
  })

  const reading = hydrateReading(res.reading)
  const drawn = hydrateDrawn(res.drawn, reading.cardDetails)

  return { spreadKind: res.spreadKind, drawn, reading }
}
