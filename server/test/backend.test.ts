/**
 * Backend unit tests
 * Tests card_loader (card face data) and buildReading (Answer lookup) using
 * the real JSON data files. No mocking — every assertion is checked against
 * the actual data source so the test moves with the data, not a frozen copy.
 *
 * The product no longer scores or interprets cards: a draw resolves to one
 * Answer (quote / translation / source) per card+orientation, looked up from
 * data/tarot_answer.json by card id.
 */

import { describe, it, expect } from 'vitest'
import { getAllCards, getCardById } from '../src/services/card_loader'
import { buildReading } from '../src/services/tarot_reading'
import answerData from '../src/data/tarot_answer.json'

const ANSWER_CARDS = (answerData as {
  cards: Record<
    string,
    {
      upright: { quote: string; translation: string; source: string }[]
      reversed: { quote: string; translation: string; source: string }[]
    }
  >
}).cards

// ---------------------------------------------------------------------------
// card_loader — card face data is preserved (id/name/nameEn/number/type/image)
// ---------------------------------------------------------------------------

describe('card_loader', () => {
  it('loads exactly 78 cards', () => {
    expect(getAllCards()).toHaveLength(78)
  })

  it('returns the same reference on repeated calls (singleton)', () => {
    expect(getAllCards()).toBe(getAllCards())
  })

  it('finds a card by id', () => {
    const card = getCardById('the_fool')
    expect(card).toBeDefined()
    expect(card!.id).toBe('the_fool')
    expect(card!.name).toBe('愚者')
  })

  it('returns undefined for an unknown id', () => {
    expect(getCardById('nonexistent_card')).toBeUndefined()
  })

  it('builds the correct image path for a major arcana card', () => {
    const card = getCardById('the_fool')!
    expect(card.image).toBe(
      '/static/themes/golden_dawn/tarot/major/major_arcana_00_the_fool.jpeg'
    )
  })

  it('builds the correct image path for a minor arcana card', () => {
    const card = getCardById('cups_ace')!
    expect(card.image).toBe(
      '/static/themes/golden_dawn/tarot/minor/cups/minor_arcana_cups_01_ace_of_cups.jpeg'
    )
  })

  it('minor arcana cards carry a suit field', () => {
    expect(getCardById('cups_ace')!.suit).toBe('cups')
  })

  it('major arcana cards have no suit field', () => {
    expect(getCardById('the_fool')!.suit).toBeUndefined()
  })

  it('no longer exposes interpretation fields (upright/reversed stripped)', () => {
    const card = getCardById('the_fool')! as Record<string, unknown>
    expect(card.upright).toBeUndefined()
    expect(card.reversed).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// buildReading — Answer lookup
// ---------------------------------------------------------------------------

describe('buildReading — single card', () => {
  it('maps a card+upright to its Answer from tarot_answer.json', () => {
    const r = buildReading([{ cardId: 'cups_ace', position: 'upright' }])
    expect(r.cardDetails).toHaveLength(1)
    const detail = r.cardDetails[0]
    expect(detail.position).toBe('upright')
    expect(detail.card.id).toBe('cups_ace')
    const expected = ANSWER_CARDS['cups_ace'].upright[0]
    expect(detail.answer).toEqual({
      quote: expected.quote,
      translation: expected.translation,
      source: expected.source,
    })
  })

  it('uses the reversed Answer when position is reversed', () => {
    const r = buildReading([{ cardId: 'cups_ace', position: 'reversed' }])
    const expected = ANSWER_CARDS['cups_ace'].reversed[0]
    expect(r.cardDetails[0].answer).toEqual({
      quote: expected.quote,
      translation: expected.translation,
      source: expected.source,
    })
  })

  it('drops translationSource — the UI shows only quote/translation/source', () => {
    const r = buildReading([{ cardId: 'the_fool', position: 'upright' }])
    expect(Object.keys(r.cardDetails[0].answer).sort()).toEqual([
      'quote',
      'source',
      'translation',
    ])
  })

  it('carries no scoring/interpretation fields', () => {
    const r = buildReading([{ cardId: 'the_fool', position: 'upright' }]) as Record<string, unknown>
    expect(r.score).toBeUndefined()
    expect(r.result).toBeUndefined()
    const detail = r.cardDetails[0] as unknown as Record<string, unknown>
    expect(detail.meaning).toBeUndefined()
  })
})

describe('buildReading — multi card', () => {
  it('preserves order and resolves each card to its Answer', () => {
    const r = buildReading([
      { cardId: 'the_fool', position: 'upright' },
      { cardId: 'swords_2', position: 'reversed' },
      { cardId: 'the_world', position: 'upright' },
    ])
    expect(r.cardDetails.map(d => d.card.id)).toEqual([
      'the_fool',
      'swords_2',
      'the_world',
    ])
    expect(r.cardDetails[1].answer).toEqual({
      quote: ANSWER_CARDS['swords_2'].reversed[0].quote,
      translation: ANSWER_CARDS['swords_2'].reversed[0].translation,
      source: ANSWER_CARDS['swords_2'].reversed[0].source,
    })
  })
})

describe('buildReading — data integrity across all 78 cards', () => {
  it('every card resolves a non-empty Answer for both orientations', () => {
    for (const card of getAllCards()) {
      for (const position of ['upright', 'reversed'] as const) {
        const r = buildReading([{ cardId: card.id, position }])
        const a = r.cardDetails[0].answer
        expect(typeof a.quote).toBe('string')
        expect(a.quote.length).toBeGreaterThan(0)
        expect(typeof a.translation).toBe('string')
        expect(a.translation.length).toBeGreaterThan(0)
        expect(typeof a.source).toBe('string')
        expect(a.source.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('buildReading — input contract', () => {
  it('throws on empty input rather than returning an empty reading', () => {
    expect(() => buildReading([])).toThrow(/at least one drawn card/i)
  })

  it('throws on unknown cardId', () => {
    expect(() => buildReading([{ cardId: 'no_such_card', position: 'upright' }]))
      .toThrow(/card not found/i)
  })
})
