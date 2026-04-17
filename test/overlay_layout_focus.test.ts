// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveCardSize } from '../app/src/core/sizing/card_size_solver'
import { getFocusScale, getBadgeOverflowPx } from '../app/src/core/layout/scene_layout'

describe('overlay_layout focus-scale and badge bounds', () => {
  describe('getFocusScale', () => {
    it('returns 1.42 for narrow screens', () => {
      expect(getFocusScale(false)).toBe(1.42)
    })

    it('returns 1.2 for wide screens', () => {
      expect(getFocusScale(true)).toBe(1.2)
    })
  })

  describe('getBadgeOverflowPx', () => {
    it('scales linearly with window width', () => {
      const at375 = getBadgeOverflowPx(375)
      const at750 = getBadgeOverflowPx(750)
      expect(at750).toBe(at375 * 2)
    })
  })

  describe('focus scale + badge margin constraints', () => {
    it('shrinks card size when focus scale and badge are both present', () => {
      const safeFrame = { x: 0, y: 0, width: 390, height: 800, centerX: 0, centerY: 0, bottomInset: 0 }
      const base = resolveCardSize({
        safeFrame,
        cardAspectRatio: 1.6,
        requirement: { horizontalSlots: 3, verticalSlots: 1 },
        focusScale: 1,
        badgeOverflowPx: 0,
      })

      const constrained = resolveCardSize({
        safeFrame,
        cardAspectRatio: 1.6,
        requirement: { horizontalSlots: 3, verticalSlots: 1 },
        focusScale: getFocusScale(false),
        badgeOverflowPx: getBadgeOverflowPx(390),
      })

      expect(constrained.width).toBeLessThanOrEqual(base.width)
    })
  })
})
