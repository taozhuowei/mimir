/**
 * Name: core/api/types
 * Purpose: single source of truth for protocol types shared between the H5
 *          client and the Express server.
 * Reason: types used to be duplicated on each side of the wire, causing
 *         drift between client expectations and server payloads. Centralising
 *         them here lets both render code and API code import from one
 *         canonical module.
 * Data flow: server JSON shapes flow in (via `client.request<T>`); the rest
 *           of the app consumes these types as plain TS interfaces.
 */

export type CardPosition = 'upright' | 'reversed'

/**
 * Supported divination spread kinds. Today only `single_card` is wired up
 * end-to-end; the union exists so future spreads can be added in one place
 * (here + the server's zod enum) instead of in every signature individually.
 */
export type SpreadKind = 'single_card'

export interface TarotCardInfo {
  id: string
  name: string
  nameEn: string
  number: number
  type: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  /** Server-resolved URL, populated after `resolveAssetUrl` wraps it. */
  image: string
}

/** Output of the local "drawn card" pipeline — card metadata + position. */
export interface DrawnResult {
  card: TarotCardInfo
  position: CardPosition
}

/** Server reply for a single drawn card, before client-side asset resolution. */
export interface DivinationDrawnEntry {
  cardId: string
  position: CardPosition
}

/**
 * One Answer (答案): the quote shown big, its translation as a sub-title,
 * and the source. `translationSource` from the data file is intentionally
 * not part of the protocol — the UI shows only these three.
 */
export interface AnswerEntry {
  quote: string
  translation: string
  source: string
}

export interface AnswerCardDetail {
  card: TarotCardInfo
  position: CardPosition
  answer: AnswerEntry
}

/**
 * Result of a divination: each drawn card paired with its Answer (the
 * 答案 — quote / translation / source). No scoring/sentiment/meaning.
 */
export interface AnswerResult {
  cardDetails: AnswerCardDetail[]
}

/** Top-level reply from `POST /api/v1/divinations`. */
export interface DivinationResponse {
  spreadKind: SpreadKind
  drawn: DivinationDrawnEntry[]
  answer: AnswerResult
}
