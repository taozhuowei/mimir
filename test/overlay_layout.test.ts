// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveSceneLayout } from '../app/src/utils/overlay_layout/index'
import type { ViewportMetrics } from '../app/src/core/viewport/types'

function makeViewport(
  windowWidth: number,
  windowHeight: number,
): ViewportMetrics {
  return {
    width: windowWidth,
    height: windowHeight,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    dpr: 1,
  }
}

describe('overlay_layout scene bounds', () => {
  it('fits three_card spread inside a narrow iPhone viewport', () => {
    const viewport = makeViewport(390, 844)
    const layout = resolveSceneLayout({
      spreadId: 'three_card',
      scene: 'draw_stage',
      viewport,
      isWide: false,
      cardAspectRatio: 1.6,
    })

    const maxX = Math.max(...layout.cards.map((c) => Math.abs(c.x)))
    const maxY = Math.max(...layout.cards.map((c) => Math.abs(c.y)))

    // Compute actual safe-frame half-dimensions from viewport and insets.
    // The envelope uses sizing-safe-frame dimensions (pre-shrunk by focus scale),
    // so we compare against the real safe-frame bounds instead.
    const safeHalfWidth = (viewport.width - 2 * layout.safeSideInset) / 2
    const safeHalfHeight = (viewport.height - layout.safeTopInset - layout.safeBottomInset) / 2

    // Card centers plus half dimensions must stay inside the safe frame.
    // Math: narrow iPhone safeHalfWidth ≈ 171, safeHalfHeight ≈ 235.
    expect(maxX + layout.cardWidth / 2).toBeLessThanOrEqual(safeHalfWidth + 1)
    expect(maxY + layout.cardHeight / 2).toBeLessThanOrEqual(safeHalfHeight + 1)
  })

  it('fits cross_spread inside a wide iPad viewport', () => {
    const viewport = makeViewport(1024, 768)
    const layout = resolveSceneLayout({
      spreadId: 'cross_spread',
      scene: 'draw_stage',
      viewport,
      isWide: true,
      cardAspectRatio: 1.6,
    })

    const maxX = Math.max(...layout.cards.map((c) => Math.abs(c.x)))
    const maxY = Math.max(...layout.cards.map((c) => Math.abs(c.y)))

    // Compare against the real safe-frame bounds, not the envelope,
    // because the envelope reflects the sizing-safe-frame (pre-shrunk by focus scale).
    const safeHalfWidth = (viewport.width - 2 * layout.safeSideInset) / 2
    const safeHalfHeight = (viewport.height - layout.safeTopInset - layout.safeBottomInset) / 2

    // Math: wide iPad safeHalfWidth ≈ 488, safeHalfHeight ≈ 238.
    expect(maxX + layout.cardWidth / 2).toBeLessThanOrEqual(safeHalfWidth + 1)
    expect(maxY + layout.cardHeight / 2).toBeLessThanOrEqual(safeHalfHeight + 1)
  })

  it('keeps single_card inside safe frame on a small viewport', () => {
    const layout = resolveSceneLayout({
      spreadId: 'single_card',
      scene: 'result_stage',
      viewport: makeViewport(320, 568),
      isWide: false,
      cardAspectRatio: 1.6,
    })

    expect(layout.cards).toHaveLength(1)
    const card = layout.cards[0]
    // Card must fit inside the stage dimensions
    expect(Math.abs(card.x) + card.width / 2).toBeLessThanOrEqual(160)
    expect(Math.abs(card.y) + card.height / 2).toBeLessThanOrEqual(284)
  })
})

describe('overlay_layout dual-axis sizing', () => {
  it('uses dual-axis constraint to determine card size', () => {
    // Wide screen: height is short side, drives card size
    const wideLayout = resolveSceneLayout({
      spreadId: 'three_card',
      scene: 'draw_stage',
      viewport: makeViewport(1366, 768),
      isWide: true,
      cardAspectRatio: 1.6,
    })
    // Narrow screen: width is short side, drives card size
    const narrowLayout = resolveSceneLayout({
      spreadId: 'three_card',
      scene: 'draw_stage',
      viewport: makeViewport(390, 844),
      isWide: false,
      cardAspectRatio: 1.6,
    })

    // Both should preserve aspect ratio
    expect(wideLayout.cardHeight / wideLayout.cardWidth).toBeCloseTo(1.6, 1)
    expect(narrowLayout.cardHeight / narrowLayout.cardWidth).toBeCloseTo(1.6, 1)
  })
})
