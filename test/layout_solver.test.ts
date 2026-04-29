// @vitest-environment node

/**
 * Test suite for the physical-pixel layout solver.
 *
 * Coverage matrix: 5 viewports × 2 scenes = 10 cases. Each case asserts:
 *   1. Cards do not overflow the viewport.
 *   2. Cards do not occlude reserved UI (header, action bar, drawer).
 *   3. drawCardWidth / drawCardHeight are uniform between scenes.
 *   4. result.cardWidth >= drawCardWidth (single card has at least as much room).
 *   5. Drawer geometry matches the contract (narrow vs wide).
 *
 * Inputs are passed as plain literals — no window mocking, no DOM access.
 */

import { describe, expect, it } from 'vitest'
import {
  solveLayout,
  type SceneKind,
  type SceneLayout,
} from '../app/src/core/sizing/layout_solver'
import {
  getDefaultReservations,
  type PhysicalViewport,
  type UiReservations,
} from '../app/src/core/sizing/physical_reservations'
import { WIDE_BREAKPOINT } from '../app/src/core/config/layout_constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESERVATIONS: UiReservations = getDefaultReservations()

function makeViewport(width: number, height: number): PhysicalViewport {
  return {
    width,
    height,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    topBarHeight: 0,
    isWide: width >= WIDE_BREAKPOINT,
  }
}

interface ViewportFixture {
  label: string
  width: number
  height: number
}

const VIEWPORTS: ViewportFixture[] = [
  { label: '320x568 narrow', width: 320, height: 568 },
  { label: '375x667 narrow', width: 375, height: 667 },
  { label: '414x896 narrow', width: 414, height: 896 },
  { label: '768x1024 wide (boundary)', width: 768, height: 1024 },
  { label: '1280x800 wide', width: 1280, height: 800 },
]

const SCENES: SceneKind[] = ['draw_stage', 'result_stage']

const EPS = 1e-6

/**
 * Reserved viewport bands (px). Cards must stay inside these.
 * For draw_stage we only check size fit (since (0,0) is a placeholder).
 * For result_stage we check the actual card screen rectangle.
 */
function reservedBounds(vp: PhysicalViewport, r: UiReservations) {
  const topReserved = vp.topBarHeight + vp.safeAreaTop + r.headerHeight
  const bottomReservedBase = r.actionBarHeight + vp.safeAreaBottom
  return { topReserved, bottomReservedBase }
}

/**
 * Result card's absolute screen rectangle, reconstructed from SceneLayout.
 * Mirrors the solver's stage-relative encoding (origin = stage center).
 */
function resultCardScreenRect(layout: SceneLayout, vp: PhysicalViewport) {
  const card = layout.cards[0]
  if (!card) throw new Error('expected at least one card')
  const stageCenterY = layout.stage.y + layout.stage.height / 2
  const cardCenterY = stageCenterY + card.y
  const stageCenterX = layout.stage.x + layout.stage.width / 2
  const cardCenterX = stageCenterX + card.x
  return {
    top: cardCenterY - card.height / 2,
    bottom: cardCenterY + card.height / 2,
    left: cardCenterX - card.width / 2,
    right: cardCenterX + card.width / 2,
    vpRight: vp.width,
    vpBottom: vp.height,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('layout_solver — physical-pixel layout solver', () => {
  for (const vpFixture of VIEWPORTS) {
    for (const scene of SCENES) {
      it(`${vpFixture.label} / ${scene}: produces a valid layout`, () => {
        const viewport = makeViewport(vpFixture.width, vpFixture.height)
        const layout = solveLayout({
          viewport,
          reservations: RESERVATIONS,
          scene,
        })
        const { topReserved, bottomReservedBase } = reservedBounds(viewport, RESERVATIONS)

        // -------------------------------------------------------------------
        // (0) Sanity — all sizes positive and finite.
        // -------------------------------------------------------------------
        expect(layout.cardWidth).toBeGreaterThan(0)
        expect(layout.cardHeight).toBeGreaterThan(0)
        expect(layout.drawCardWidth).toBeGreaterThan(0)
        expect(layout.drawCardHeight).toBeGreaterThan(0)
        expect(Number.isFinite(layout.cardWidth)).toBe(true)
        expect(Number.isFinite(layout.drawer.initialHeight)).toBe(true)

        // -------------------------------------------------------------------
        // (1) Card aspect ratio respected.
        // -------------------------------------------------------------------
        expect(layout.cardHeight / layout.cardWidth).toBeCloseTo(
          RESERVATIONS.cardAspectRatio,
          5,
        )
        expect(layout.drawCardHeight / layout.drawCardWidth).toBeCloseTo(
          RESERVATIONS.cardAspectRatio,
          5,
        )

        // -------------------------------------------------------------------
        // (2) Card width within legibility bounds OR equal to a derived
        //     dimension that's already smaller than maxCardWidth (clamp ok).
        // -------------------------------------------------------------------
        expect(layout.cardWidth).toBeGreaterThanOrEqual(RESERVATIONS.minCardWidth - EPS)
        expect(layout.cardWidth).toBeLessThanOrEqual(RESERVATIONS.maxCardWidth + EPS)
        expect(layout.drawCardWidth).toBeGreaterThanOrEqual(RESERVATIONS.minCardWidth - EPS)
        expect(layout.drawCardWidth).toBeLessThanOrEqual(RESERVATIONS.maxCardWidth + EPS)

        // -------------------------------------------------------------------
        // (3) Draw-stage uniform card size (envelope reflects worst case).
        // -------------------------------------------------------------------
        expect(layout.envelope.cardWidth).toBeCloseTo(layout.drawCardWidth, 5)
        expect(layout.envelope.cardHeight).toBeCloseTo(layout.drawCardHeight, 5)
        const expectedCols = viewport.isWide ? 3 : 1
        const expectedRows = viewport.isWide ? 1 : 3
        expect(layout.envelope.horizontalSlots).toBe(expectedCols)
        expect(layout.envelope.verticalSlots).toBe(expectedRows)

        // -------------------------------------------------------------------
        // (4) Stage rectangle is inside the viewport.
        // -------------------------------------------------------------------
        expect(layout.stage.x).toBeGreaterThanOrEqual(0)
        expect(layout.stage.y).toBeGreaterThanOrEqual(0)
        expect(layout.stage.x + layout.stage.width).toBeLessThanOrEqual(viewport.width + EPS)
        expect(layout.stage.y + layout.stage.height).toBeLessThanOrEqual(viewport.height + EPS)

        // Wide + result_stage: stage shrinks to leave room for the side drawer.
        if (scene === 'result_stage' && viewport.isWide) {
          expect(layout.stage.width).toBeCloseTo(
            viewport.width - RESERVATIONS.drawerWideWidth,
            5,
          )
        } else {
          expect(layout.stage.width).toBeCloseTo(viewport.width, 5)
        }

        // -------------------------------------------------------------------
        // (5) Drawer geometry contract.
        // -------------------------------------------------------------------
        if (viewport.isWide) {
          expect(layout.drawer.rightAligned).toBe(true)
          expect(layout.drawer.width).toBeCloseTo(RESERVATIONS.drawerWideWidth, 5)
          expect(layout.drawer.initialTop).toBeCloseTo(0, 5)
          expect(layout.drawer.initialHeight).toBeCloseTo(viewport.height, 5)
          expect(layout.drawer.maxHeight).toBeCloseTo(viewport.height, 5)
        } else {
          expect(layout.drawer.rightAligned).toBe(false)
          expect(layout.drawer.width).toBeCloseTo(viewport.width, 5)
          // initialTop + initialHeight == viewport.height (exact identity).
          expect(layout.drawer.initialTop + layout.drawer.initialHeight).toBeCloseTo(
            viewport.height,
            5,
          )
          expect(layout.drawer.maxHeight).toBeCloseTo(viewport.height, 5)
        }

        // -------------------------------------------------------------------
        // (6) Scene-specific assertions.
        // -------------------------------------------------------------------
        if (scene === 'result_stage') {
          // Single card.
          expect(layout.cards).toHaveLength(1)
          expect(layout.cards[0]?.slotId).toBe('center')

          // Card size >= draw card size (single card has at least as much room).
          expect(layout.cardWidth).toBeGreaterThanOrEqual(layout.drawCardWidth - EPS)

          const rect = resultCardScreenRect(layout, viewport)
          // Card stays inside viewport horizontally and vertically.
          expect(rect.left).toBeGreaterThanOrEqual(-EPS)
          expect(rect.top).toBeGreaterThanOrEqual(-EPS)
          expect(rect.right).toBeLessThanOrEqual(rect.vpRight + EPS)
          expect(rect.bottom).toBeLessThanOrEqual(rect.vpBottom + EPS)

          // Card stays inside the stage horizontally (matters on wide).
          if (viewport.isWide) {
            expect(rect.right).toBeLessThanOrEqual(layout.stage.width + EPS)
          }

          // Does not occlude the header.
          expect(rect.top).toBeGreaterThanOrEqual(topReserved - EPS)

          if (viewport.isWide) {
            // Wide: drawer is a side panel — vertical bound is action bar.
            const bottomLimit = viewport.height - bottomReservedBase
            expect(rect.bottom).toBeLessThanOrEqual(bottomLimit + EPS)
          } else {
            // Narrow: drawer.initialTop = card_bottom - overlap (exactly).
            expect(layout.drawer.initialTop).toBeCloseTo(
              rect.bottom - RESERVATIONS.drawerCardOverlap,
              5,
            )
            // Narrow drawer must be at least the minimum useful height.
            expect(layout.drawer.initialHeight).toBeGreaterThanOrEqual(
              RESERVATIONS.drawerMinInitialHeight - EPS,
            )
          }

          // stageShiftY is signed offset from default (0) — finite check.
          expect(Number.isFinite(layout.stageShiftY)).toBe(true)
        } else {
          // draw_stage — placeholder card at (0, 0).
          expect(layout.cards).toHaveLength(1)
          expect(layout.cards[0]?.slotId).toBe('center')
          expect(layout.cards[0]?.x).toBeCloseTo(0, 5)
          expect(layout.cards[0]?.y).toBeCloseTo(0, 5)
          expect(layout.stageShiftY).toBeCloseTo(0, 5)

          // Size fit check: rowsDraw cards stacked vertically (or 1 row of 3)
          // must fit inside the available band between header and action bar.
          const availableH =
            viewport.height -
            viewport.topBarHeight -
            viewport.safeAreaTop -
            RESERVATIONS.headerHeight -
            RESERVATIONS.actionBarHeight -
            viewport.safeAreaBottom
          const usedH =
            expectedRows * layout.drawCardHeight +
            (expectedRows - 1) * RESERVATIONS.cardGap
          expect(usedH).toBeLessThanOrEqual(availableH + EPS)

          const availableW = viewport.width - 2 * RESERVATIONS.cardSideMargin
          const usedW =
            expectedCols * layout.drawCardWidth +
            (expectedCols - 1) * RESERVATIONS.cardGap
          expect(usedW).toBeLessThanOrEqual(availableW + EPS)
        }
      })
    }
  }

  it('drawCardWidth is identical between draw_stage and result_stage on the same viewport', () => {
    for (const vpFixture of VIEWPORTS) {
      const viewport = makeViewport(vpFixture.width, vpFixture.height)
      const draw = solveLayout({ viewport, reservations: RESERVATIONS, scene: 'draw_stage' })
      const result = solveLayout({ viewport, reservations: RESERVATIONS, scene: 'result_stage' })
      expect(result.drawCardWidth).toBeCloseTo(draw.drawCardWidth, 5)
      expect(result.drawCardHeight).toBeCloseTo(draw.drawCardHeight, 5)
    }
  })
})
