/**
 * Tarot Reading Service
 *
 * Purpose:
 *   Owns the full divination pipeline on the backend — random card
 *   selection, orientation, then mapping each drawn card to its "答案"
 *   (the Answer): a single famous quote with its translation and source.
 *   The frontend never holds draw randomness or any interpretation data.
 *
 * Why:
 *   The product no longer scores/interprets cards (no sentiment, no
 *   meaning text). A draw now yields exactly one assertive quote — the
 *   Answer — looked up from `data/tarot_answer.json` by card id +
 *   orientation. `tarot_answer.json` is the single source of truth for
 *   that content; the per-suit JSON files only carry card face data
 *   (id/name/image/...).
 *
 * Data flow:
 *   getAllCards() ──▶ Fisher-Yates shuffle ──▶ pick N (N depends on spread)
 *                                              │
 *                                              ▼  random orientation
 *                                        DrawnInput[]
 *                                              │
 *                                              ▼  answer lookup by id+pos
 *                                  { drawn, reading: AnswerResult }
 *
 * Random source:
 *   Uses node:crypto via utils/secure_random. The shuffle and orientation
 *   steps therefore draw from the platform CSPRNG. This is overkill for a
 *   tarot demo but keeps the project-wide ban on Math.random consistent
 *   and removes any predictability concerns from v8's PRNG state.
 *
 * The response field is `answer` (renamed from the pre-Answer design's
 * `reading`); see docs/glossary.md for the product term 答案.
 */

import { getAllCards, getCardById, type TarotCard } from './card_loader'
import { randomBelow, randomBool } from '../utils/secure_random'
import answerData from '../data/tarot_answer.json'

export interface DrawnInput {
  cardId: string
  position: 'upright' | 'reversed'
}

/** One Answer entry: the quote shown big, its translation, and the source. */
export interface AnswerEntry {
  quote: string
  translation: string
  source: string
}

export interface CardDetail {
  card: TarotCard
  position: 'upright' | 'reversed'
  answer: AnswerEntry
}

export interface AnswerResult {
  cardDetails: CardDetail[]
}

export interface DivinationOutput {
  /** Echo of the request so callers can branch on spread without keeping
   *  request-side state. Today only `single_card` is supported; this field
   *  is the protocol's extension point for future multi-card spreads. */
  spreadKind: 'single_card'
  drawn: DrawnInput[]
  answer: AnswerResult
}

// Spread → number of cards drawn. Currently single-card only; extending to
// multi-card spreads later means adding entries here AND extending the route
// validator. Keep this list and the route's zod enum in lock-step.
const SPREAD_DRAW_COUNT: Record<string, number> = {
  single_card: 1,
}

// Raw shape of one orientation slot in tarot_answer.json. The file stores
// translationSource too, but the UI shows only quote/translation/source so
// it is intentionally dropped at the mapping boundary below.
interface AnswerSide {
  quote: string
  source: string
  translation: string
  translationSource: string
}

// tarot_answer.json is the single source of truth for Answer content. Its
// `cards` keys are aligned 1:1 with the card ids from card_loader (see the
// per-suit JSON `id` fields), so the lookup is a direct id index.
const ANSWER_CARDS = (answerData as {
  cards: Record<string, { upright: AnswerSide[]; reversed: AnswerSide[] }>
}).cards

/** Resolve the Answer for a card id + orientation. */
function getAnswer(cardId: string, position: 'upright' | 'reversed'): AnswerEntry {
  const entry = ANSWER_CARDS[cardId]
  if (!entry) throw new Error(`Answer not found: ${cardId}`)
  const side = entry[position]?.[0]
  if (!side) throw new Error(`Answer missing ${position} for: ${cardId}`)
  return { quote: side.quote, translation: side.translation, source: side.source }
}

/**
 * Build the reading: resolve each drawn card to its face data + the Answer
 * for its orientation. Throws on an unknown card id or a missing Answer —
 * both indicate corrupted data files, never a well-formed client request.
 *
 * Kept exported because integration tests and the divination service both
 * depend on it; do not collapse into performDivination.
 */
export function buildAnswer(inputs: DrawnInput[]): AnswerResult {
  if (inputs.length === 0) {
    throw new Error('buildAnswer requires at least one drawn card')
  }

  const cardDetails: CardDetail[] = inputs.map(({ cardId, position }) => {
    const card = getCardById(cardId)
    if (!card) throw new Error(`Card not found: ${cardId}`)
    return { card, position, answer: getAnswer(cardId, position) }
  })

  return { cardDetails }
}

/**
 * Fisher-Yates in-place shuffle. Operates on a fresh copy so callers can pass
 * the cached card list without mutating it. Uses the CSPRNG-backed
 * `randomBelow` helper — see file header note on random source.
 */
function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Run a complete divination: shuffle the deck, pick N cards (N is fixed per
 * spread), randomly orient each card upright/reversed, and resolve the
 * Answer for each.
 *
 * Throws on unknown spreadKind — the route layer validates first, so this is
 * a defensive backstop, not the primary error surface.
 */
export function performDivination(spreadKind: 'single_card'): DivinationOutput {
  const draw_count = SPREAD_DRAW_COUNT[spreadKind]
  if (draw_count === undefined) {
    throw new Error(`Unknown spreadKind: ${spreadKind}`)
  }

  const shuffled = shuffle(getAllCards())
  const picked = shuffled.slice(0, draw_count)

  const drawn: DrawnInput[] = picked.map(card => ({
    cardId: card.id,
    position: randomBool() ? 'upright' : 'reversed',
  }))

  const answer = buildAnswer(drawn)
  return { spreadKind, drawn, answer }
}
