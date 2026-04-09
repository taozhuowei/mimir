/**
 * tarotReading 前端单元测试
 * Phase 1 后：本文件只测试留在前端的逻辑。
 * generateReading / loadAllCards / getCardScore 已迁移至后端，相关测试移除。
 */

import { describe, expect, it } from 'vitest'
import { drawCards, type TarotCardInfo, type DrawnResult } from '../app/src/utils/tarotReading'

// 构造最小合法的 TarotCardInfo 用于测试，不依赖实际 JSON 数据
function makeCard(id: string, sentiment: 'positive' | 'negative' | 'neutral' = 'positive'): TarotCardInfo {
  return {
    id,
    name: id,
    nameEn: id,
    number: 0,
    type: 'major',
    image: `http://localhost:3000/static/themes/golden_dawn/tarot/major/major_arcana_00_${id}.jpeg`,
    upright: { keywords: [], meaning: `${id} upright`, sentiment },
    reversed: { keywords: [], meaning: `${id} reversed`, sentiment: sentiment === 'positive' ? 'negative' : 'positive' }
  }
}

const MOCK_DECK: TarotCardInfo[] = Array.from({ length: 10 }, (_, i) => makeCard(`card_${i}`))

describe('drawCards', () => {
  it('draws exactly 3 cards when count is 3', () => {
    const drawn = drawCards(MOCK_DECK, 3)
    expect(drawn).toHaveLength(3)
  })

  it('each drawn card has a valid position', () => {
    const drawn = drawCards(MOCK_DECK, 3)
    drawn.forEach((d: DrawnResult) => {
      expect(['upright', 'reversed']).toContain(d.position)
    })
  })

  it('each drawn card exists in the original deck', () => {
    const drawn = drawCards(MOCK_DECK, 3)
    drawn.forEach((d: DrawnResult) => {
      expect(MOCK_DECK.find(c => c.id === d.card.id)).toBeDefined()
    })
  })

  it('draws unique cards (no duplicates)', () => {
    const drawn = drawCards(MOCK_DECK, 3)
    const ids = drawn.map(d => d.card.id)
    expect(new Set(ids).size).toBe(3)
  })
})
