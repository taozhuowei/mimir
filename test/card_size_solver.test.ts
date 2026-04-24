// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveCardSize } from '../app/src/core/sizing/card_size_solver'
import type { SafeFrame } from '../app/src/core/viewport/types'

function makeSafeFrame(w: number, h: number): SafeFrame {
  return {
    width: w,
    height: h,
    x: 0,
    y: 0,
    centerX: 0,
    centerY: 0,
    bottomInset: 0,
  }
}

describe('card_size_solver', () => {
  it('single_card on narrow screen: width-constrained (only 1 slot each axis)', () => {
    // 390x844 narrow, single_card (1x1) → width = 390 drives since hSlots=1, vSlots=1
    const safeFrame = makeSafeFrame(390, 844)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
    })
    // widthConstrained = 390 * 0.85 = 331.5
    // heightConstrained = (844 * 0.85) / 1.6 = 448.375
    // min(331.5, 448.375) = 331.5
    const expectedWidth = 390 * 0.85
    expect(size.width).toBeCloseTo(expectedWidth, 0)
    expect(size.height).toBeCloseTo(expectedWidth * 1.6, 0)
    expect(size.gap).toBe(16)
  })

  it('three_card narrow: height-constrained because 3 vSlots overflow', () => {
    // 390x844, three_card narrow (1x3) → 3 vertical slots
    const safeFrame = makeSafeFrame(390, 844)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 3 },
    })
    // widthConstrained = 390 * 0.85 = 331.5
    // heightConstrained = ((844 - 2*16) / 3 * 0.85) / 1.6 = (812/3 * 0.85) / 1.6 = 143.79
    // min(331.5, 143.79) = 143.79 → height constraint binds
    const heightConstrainedWidth = ((844 - 2 * 16) / 3 * 0.85) / 1.6
    expect(size.width).toBeCloseTo(heightConstrainedWidth, 0)
    expect(size.height).toBeCloseTo(heightConstrainedWidth * 1.6, 0)
    // Verify 3 cards + gaps fit within safe frame height
    const totalHeight = size.height * 3 + size.gap * 2
    expect(totalHeight).toBeLessThanOrEqual(safeFrame.height)
  })

  it('three_card wide: width-constrained with 3 hSlots', () => {
    // 1366x768 wide, three_card (3x1) → 3 horizontal slots
    const safeFrame = makeSafeFrame(1366, 768)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 3, verticalSlots: 1 },
    })
    // widthConstrained = (1366 - 2*16) / 3 * 0.85 = 1334/3 * 0.85 = 377.97
    // heightConstrained = (768 * 0.85) / 1.6 = 408
    // min(377.97, 408) = 377.97
    const widthConstrained = ((1366 - 2 * 16) / 3) * 0.85
    const heightConstrained = (768 * 0.85) / 1.6
    const expected = Math.min(widthConstrained, heightConstrained)
    expect(size.width).toBeCloseTo(expected, 0)
    expect(size.height).toBeCloseTo(expected * 1.6, 0)
  })

  it('preserves fixed aspect ratio on any screen', () => {
    const narrow = resolveCardSize({
      safeFrame: makeSafeFrame(375, 812),
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
    })
    const wide = resolveCardSize({
      safeFrame: makeSafeFrame(1920, 1080),
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
    })
    expect(narrow.height / narrow.width).toBeCloseTo(1.6, 5)
    expect(wide.height / wide.width).toBeCloseTo(1.6, 5)
  })

  it('cross_spread 3x3 on narrow screen: both axes constrained, min wins', () => {
    // 390x844, cross_spread (3x3)
    const safeFrame = makeSafeFrame(390, 844)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 3, verticalSlots: 3 },
    })
    // widthConstrained = (390 - 2*16) / 3 * 0.85 = 101.47
    // heightConstrained = ((844 - 2*16) / 3 * 0.85) / 1.6 = 143.79
    // min(101.47, 143.79) = 101.47 → width constraint binds
    const widthConstrained = ((390 - 2 * 16) / 3) * 0.85
    expect(size.width).toBeCloseTo(widthConstrained, 0)
    expect(size.height).toBeCloseTo(widthConstrained * 1.6, 0)
  })

  it('cross_spread 3x3 on wide screen: both axes constrained, min wins', () => {
    // 1366x768, cross_spread (3x3)
    const safeFrame = makeSafeFrame(1366, 768)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 3, verticalSlots: 3 },
    })
    // widthConstrained = (1366 - 2*16) / 3 * 0.85 = 377.97
    // heightConstrained = ((768 - 2*16) / 3 * 0.85) / 1.6 = 130.67
    // min(377.97, 130.67) = 130.67 → height constraint binds
    const heightConstrained = ((768 - 2 * 16) / 3 * 0.85) / 1.6
    expect(size.width).toBeCloseTo(heightConstrained, 0)
    expect(size.height).toBeCloseTo(heightConstrained * 1.6, 0)
  })

  it('respects maxCardWidth clamp', () => {
    const safeFrame = makeSafeFrame(2000, 2000)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
    })
    expect(size.width).toBe(512)
    expect(size.height).toBeCloseTo(512 * 1.6, 5)
  })

  it('respects minCardWidth clamp', () => {
    const safeFrame = makeSafeFrame(10, 10)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 3, verticalSlots: 3 },
      minCardWidth: 64,
    })
    expect(size.width).toBe(64)
    expect(size.height).toBeCloseTo(64 * 1.6, 5)
  })

  it('uses provided gap', () => {
    const safeFrame = makeSafeFrame(400, 800)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 2, verticalSlots: 1 },
      gap: 32,
    })
    expect(size.gap).toBe(32)
  })

  it('handles safeFrame smaller than required gap by returning minCardWidth', () => {
    const safeFrame = makeSafeFrame(10, 10)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 3, verticalSlots: 3 },
      minCardWidth: 64,
    })
    expect(size.width).toBe(64)
  })

  it('square safeFrame: dual-axis constraint picks height due to aspect ratio', () => {
    const safeFrame = makeSafeFrame(500, 500)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
    })
    // widthConstrained = 500 * 0.85 = 425
    // heightConstrained = (500 * 0.85) / 1.6 = 265.625
    // min(425, 265.625) = 265.625 → height constraint binds
    const heightConstrained = (500 * 0.85) / 1.6
    expect(size.width).toBeCloseTo(heightConstrained, 0)
    expect(size.height).toBeCloseTo(heightConstrained * 1.6, 0)
  })

  it('cards always fit within safe frame in both directions', () => {
    // Exhaustive check across various configurations
    const configs = [
      { w: 375, h: 812, hSlots: 1, vSlots: 1 },
      { w: 375, h: 812, hSlots: 1, vSlots: 3 },
      { w: 375, h: 812, hSlots: 3, vSlots: 3 },
      { w: 1366, h: 768, hSlots: 3, vSlots: 1 },
      { w: 1366, h: 768, hSlots: 3, vSlots: 3 },
      { w: 320, h: 568, hSlots: 1, vSlots: 3 },
    ]

    for (const { w, h, hSlots, vSlots } of configs) {
      const safeFrame = makeSafeFrame(w, h)
      const size = resolveCardSize({
        safeFrame,
        cardAspectRatio: 1.6,
        requirement: { horizontalSlots: hSlots, verticalSlots: vSlots },
      })
      const totalWidth = size.width * hSlots + size.gap * (hSlots - 1)
      const totalHeight = size.height * vSlots + size.gap * (vSlots - 1)
      expect(totalWidth).toBeLessThanOrEqual(w * 1.001) // tiny float tolerance
      expect(totalHeight).toBeLessThanOrEqual(h * 1.001)
    }
  })
})
