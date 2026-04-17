// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveResultLayout } from '../app/src/core/layout/result_layout_resolver'
import type { SpreadSlot } from '../app/src/core/layout/types'
import type { SafeFrame } from '../app/src/core/viewport/types'
import type { CardSize } from '../app/src/core/sizing/types'

const cardSize: CardSize = { width: 60, height: 100, gap: 12 }
const slotPitchY = cardSize.height + cardSize.gap // 112
const slotPitchX = cardSize.width + cardSize.gap // 72

function makeSafeFrame(w: number, h: number): SafeFrame {
  return {
    width: w,
    height: h,
    x: 0,
    y: 0,
    topInset: 0,
    bottomInset: 0,
    centerX: w / 2,
    centerY: h / 2,
  }
}

describe('resolveResultLayout', () => {
  it('single_card places center card and applies headerHeight offset', () => {
    const safeFrame = makeSafeFrame(390, 844)
    const result = resolveResultLayout('single_card', [], safeFrame, cardSize, 50)

    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].slotId).toBe('center')
    expect(result.cards[0].x).toBe(0)
    expect(result.cards[0].y).toBe(25) // headerHeight / 2
    expect(result.stageShiftY).toBe(0)
  })

  it('single_card respects zIndexes override', () => {
    const safeFrame = makeSafeFrame(390, 844)
    const result = resolveResultLayout('single_card', [], safeFrame, cardSize, 0, { center: 99 })
    expect(result.cards[0].zIndex).toBe(99)
  })

  it('three_card narrow column centers vertically and applies headerHeight', () => {
    const safeFrame = makeSafeFrame(390, 844)
    const slots: SpreadSlot[] = [
      { slotId: 'past', x: 0, y: slotPitchY },
      { slotId: 'present', x: 0, y: 0 },
      { slotId: 'future', x: 0, y: -slotPitchY },
    ]
    const result = resolveResultLayout('three_card', slots, safeFrame, cardSize, 40)

    const present = result.cards.find(c => c.slotId === 'present')!
    expect(present.x).toBe(0)
    expect(present.y).toBe(20) // headerHeight / 2

    const past = result.cards.find(c => c.slotId === 'past')!
    const future = result.cards.find(c => c.slotId === 'future')!
    expect(past.y - present.y).toBe(slotPitchY)
    expect(present.y - future.y).toBe(slotPitchY)
  })

  it('three_card wide row uses horizontal layout', () => {
    const safeFrame = makeSafeFrame(844, 390)
    const slots: SpreadSlot[] = [
      { slotId: 'past', x: -slotPitchX, y: 0 },
      { slotId: 'present', x: 0, y: 0 },
      { slotId: 'future', x: slotPitchX, y: 0 },
    ]
    const result = resolveResultLayout('three_card', slots, safeFrame, cardSize)

    const past = result.cards.find(c => c.slotId === 'past')!
    const present = result.cards.find(c => c.slotId === 'present')!
    const future = result.cards.find(c => c.slotId === 'future')!

    expect(present.y).toBe(past.y)
    expect(past.x).toBe(-future.x)
    expect(present.x).toBe(0)
  })

  it('three_card clamps centerY within safe bounds on tiny screen', () => {
    const safeFrame = makeSafeFrame(320, 300)
    const slots: SpreadSlot[] = [
      { slotId: 'past', x: 0, y: slotPitchY },
      { slotId: 'present', x: 0, y: 0 },
      { slotId: 'future', x: 0, y: -slotPitchY },
    ]
    const result = resolveResultLayout('three_card', slots, safeFrame, cardSize, 100)

    const present = result.cards.find(c => c.slotId === 'present')!
    // Should be clamped so entire column fits inside safe frame
    const minY = -safeFrame.height / 2 + cardSize.height / 2 + Math.max(cardSize.height * 0.06, 12)
    const maxY = safeFrame.height / 2 - cardSize.height / 2 - Math.max(cardSize.height * 0.06, 12)
    expect(present.y).toBeGreaterThanOrEqual(minY)
    expect(present.y).toBeLessThanOrEqual(maxY)
  })

  it('cross_spread positions cards around center with headerHeight offset', () => {
    const safeFrame = makeSafeFrame(390, 844)
    const slots: SpreadSlot[] = [
      { slotId: 'center', x: 0, y: 0 },
      { slotId: 'north', x: 0, y: -slotPitchY },
      { slotId: 'south', x: 0, y: slotPitchY },
      { slotId: 'west', x: -slotPitchX, y: 0 },
      { slotId: 'east', x: slotPitchX, y: 0 },
    ]
    const result = resolveResultLayout('cross_spread', slots, safeFrame, cardSize, 60)

    const center = result.cards.find(c => c.slotId === 'center')!
    const north = result.cards.find(c => c.slotId === 'north')!
    const south = result.cards.find(c => c.slotId === 'south')!
    const west = result.cards.find(c => c.slotId === 'west')!
    const east = result.cards.find(c => c.slotId === 'east')!

    expect(center.y).toBe(30) // headerHeight / 2
    expect(north.y).toBe(center.y - slotPitchY)
    expect(south.y).toBe(center.y + slotPitchY)
    expect(west.x).toBe(-slotPitchX)
    expect(east.x).toBe(slotPitchX)
    expect(center.zIndex).toBe(25)
  })

  it('cross_spread respects zIndexes override', () => {
    const safeFrame = makeSafeFrame(390, 844)
    const slots: SpreadSlot[] = [
      { slotId: 'center', x: 0, y: 0 },
      { slotId: 'north', x: 0, y: -slotPitchY },
      { slotId: 'south', x: 0, y: slotPitchY },
      { slotId: 'west', x: -slotPitchX, y: 0 },
      { slotId: 'east', x: slotPitchX, y: 0 },
    ]
    const result = resolveResultLayout('cross_spread', slots, safeFrame, cardSize, 0, {
      center: 50, north: 40, south: 40, west: 40, east: 40,
    })

    const center = result.cards.find(c => c.slotId === 'center')!
    expect(center.zIndex).toBe(50)
  })

  it('unknown spread id falls back to generic layout', () => {
    const safeFrame = makeSafeFrame(400, 400)
    const slots: SpreadSlot[] = [
      { slotId: 'a', x: 0, y: 20 },
      { slotId: 'b', x: 0, y: -20 },
    ]
    const result = resolveResultLayout('custom_spread', slots, safeFrame, cardSize)

    expect(result.cards).toHaveLength(2)
    expect(result.cards[0].y).toBe(20)
    expect(result.cards[1].y).toBe(-20)
  })
})
