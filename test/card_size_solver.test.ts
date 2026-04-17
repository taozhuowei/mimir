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
  it('resolves a 1x1 envelope and clamps to default maxCardWidth=188', () => {
    const safeFrame = makeSafeFrame(200, 320)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
    })
    // unconstrained width would be 200, but default MAX_CARD_WIDTH=188 clamps it
    expect(size.width).toBe(188)
    expect(size.height).toBeCloseTo(188 * 1.6, 5)
    expect(size.gap).toBe(16)
  })

  it('respects maxCardWidth clamp', () => {
    const safeFrame = makeSafeFrame(1000, 1600)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
      maxCardWidth: 188,
    })
    expect(size.width).toBe(188)
    expect(size.height).toBeCloseTo(188 * 1.6, 5)
  })

  it('respects minCardWidth clamp', () => {
    const safeFrame = makeSafeFrame(10, 16)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
      minCardWidth: 64,
    })
    expect(size.width).toBe(64)
    expect(size.height).toBeCloseTo(64 * 1.6, 5)
  })

  it('chooses vertical constraint when it is tighter', () => {
    // 400x200 safe frame, 2x1 envelope
    // horizontal: (400 - 16) / 2 = 192
    // vertical: (200 - 0) / 1 = 200 -> width from vertical = 200/1.6 = 125
    const safeFrame = makeSafeFrame(400, 200)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 2, verticalSlots: 1 },
      gap: 16,
    })
    expect(size.width).toBe(125)
    expect(size.height).toBe(200)
  })

  it('focusScale > 1 reduces card size to leave room for scaling', () => {
    // 400x400, 2x1, gap=0
    // original horizontal: 400/2 = 200
    // focused: (400 - 0 - 2*0*1.42) / (2 - 1 + 1.42) = 400 / 2.42 ≈ 165.3
    const safeFrame = makeSafeFrame(400, 400)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 2, verticalSlots: 1 },
      gap: 0,
      focusScale: 1.42,
    })
    expect(size.width).toBeLessThan(200)
    expect(size.width).toBeCloseTo(400 / 2.42, 0)
  })

  it('badgeOverflowPx > 0 reduces card size further', () => {
    // Use a larger safe frame so maxCardWidth default does not clamp
    // 800x800, 2x1, gap=0, focusScale=1
    // original: 400
    // focused with badge: (800 - 0 - 2*12*1) / (2 - 1 + 1) = (800 - 24) / 2 = 388
    const safeFrame = makeSafeFrame(800, 800)
    const sizeWithoutBadge = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 2, verticalSlots: 1 },
      gap: 0,
      focusScale: 1,
      badgeOverflowPx: 0,
      maxCardWidth: 400,
    })
    const sizeWithBadge = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 2, verticalSlots: 1 },
      gap: 0,
      focusScale: 1,
      badgeOverflowPx: 12,
      maxCardWidth: 400,
    })
    expect(sizeWithBadge.width).toBeLessThan(sizeWithoutBadge.width)
    expect(sizeWithBadge.width).toBe(388)
  })

  it('combined focusScale and badgeOverflowPx work together', () => {
    // 400x400, 2x1, gap=0, focusScale=1.2, badge=8
    // focused: (400 - 0 - 2*8*1.2) / (2 - 1 + 1.2) = (400 - 19.2) / 2.2 ≈ 173.1
    const safeFrame = makeSafeFrame(400, 400)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 2, verticalSlots: 1 },
      gap: 0,
      focusScale: 1.2,
      badgeOverflowPx: 8,
    })
    expect(size.width).toBeCloseTo((400 - 19.2) / 2.2, 0)
  })

  it('returns gap from input when provided', () => {
    const safeFrame = makeSafeFrame(200, 320)
    const size = resolveCardSize({
      safeFrame,
      cardAspectRatio: 1.6,
      requirement: { horizontalSlots: 1, verticalSlots: 1 },
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
})
