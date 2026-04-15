/**
 * Name: overlay_card_envelope
 * Purpose: derive the largest card size that satisfies the worst-case animation envelope.
 * Reason: single source of truth for "max bounds during the entire flow" so sizing,
 *   positioning, shuffle spread and cut spread all agree on the same limits.
 * Data flow: safe frame + slot requirements flow in; card size, gap and slot pitches flow out.
 */

import type { SpreadKind } from './overlay_layout_types'

export interface CardEnvelopeRequirement {
  /** Maximum number of cards that must fit horizontally (with gaps) at any animation frame. */
  horizontalSlots: number
  /** Maximum number of cards that must fit vertically (with gaps) at any animation frame. */
  verticalSlots: number
}

export interface CardEnvelopeInput extends CardEnvelopeRequirement {
  safeWidth: number
  safeHeight: number
  /** height / width */
  cardAspectRatio: number
  gap?: number
  minCardWidth?: number
  maxCardWidth?: number
}

export interface CardEnvelope {
  cardWidth: number
  cardHeight: number
  gap: number
  horizontalSlots: number
  verticalSlots: number
  /** Distance between adjacent slot centers along X (= cardWidth + gap). */
  slotPitchX: number
  /** Distance between adjacent slot centers along Y (= cardHeight + gap). */
  slotPitchY: number
  /** Half of the total horizontal extent at full layout (centered). */
  halfSpanX: number
  /** Half of the total vertical extent at full layout (centered). */
  halfSpanY: number
  /** Total horizontal extent occupied at full layout. */
  fullSpanX: number
  /** Total vertical extent occupied at full layout. */
  fullSpanY: number
}

export const DEFAULT_ENVELOPE_GAP = 16
const DEFAULT_MIN_CARD_WIDTH = 64
const DEFAULT_MAX_CARD_WIDTH = 188

/**
 * Resolve the maximum card size that keeps a `H x V` slot grid (with gaps) inside the safe frame.
 * The same envelope is consumed by sizing, spread positioning, shuffle and cut animations so
 * that no animation frame can exceed the available bounds.
 */
export function resolveOverlayCardEnvelope(input: CardEnvelopeInput): CardEnvelope {
  const {
    safeWidth,
    safeHeight,
    cardAspectRatio,
    gap = DEFAULT_ENVELOPE_GAP,
    minCardWidth = DEFAULT_MIN_CARD_WIDTH,
    maxCardWidth = DEFAULT_MAX_CARD_WIDTH,
  } = input

  const hSlots = Math.max(1, Math.floor(input.horizontalSlots))
  const vSlots = Math.max(1, Math.floor(input.verticalSlots))

  const widthFromHorizontal = (Math.max(0, safeWidth) - (hSlots - 1) * gap) / hSlots
  const heightFromVertical = (Math.max(0, safeHeight) - (vSlots - 1) * gap) / vSlots
  const widthFromVertical = heightFromVertical / Math.max(cardAspectRatio, 0.0001)

  let cardWidth = Math.min(widthFromHorizontal, widthFromVertical)
  cardWidth = Math.max(minCardWidth, Math.min(cardWidth, maxCardWidth))
  const cardHeight = cardWidth * cardAspectRatio

  const slotPitchX = cardWidth + gap
  const slotPitchY = cardHeight + gap

  return {
    cardWidth,
    cardHeight,
    gap,
    horizontalSlots: hSlots,
    verticalSlots: vSlots,
    slotPitchX,
    slotPitchY,
    halfSpanX: ((hSlots - 1) * slotPitchX) / 2,
    halfSpanY: ((vSlots - 1) * slotPitchY) / 2,
    fullSpanX: hSlots * cardWidth + (hSlots - 1) * gap,
    fullSpanY: vSlots * cardHeight + (vSlots - 1) * gap,
  }
}

/**
 * Worst-case slot envelope per spread, taking every animation phase into account:
 *   - shuffle spreads cards 2-wide horizontally
 *   - cut shows 3 cards stacked vertically on narrow / 3 cards spread horizontally on wide
 *   - draw stacks the spread's full layout (1, 3 or 5 cards)
 * Sizing respects the union so no animation frame can ever overflow the safe frame.
 */
export function getSpreadEnvelopeRequirement(
  spreadKind: SpreadKind,
  isWide: boolean,
): CardEnvelopeRequirement {
  // Cut animation is always present and dictates a baseline of 3 along the cut axis.
  const cutH = isWide ? 3 : 1
  const cutV = isWide ? 1 : 3

  // Shuffle always spreads two card widths horizontally.
  const shuffleH = 2
  const shuffleV = 1

  let drawH: number
  let drawV: number
  switch (spreadKind) {
    case 'single_card':
      drawH = 1
      drawV = 1
      break
    case 'three_card':
      drawH = isWide ? 3 : 1
      drawV = isWide ? 1 : 3
      break
    case 'cross_spread':
      drawH = 3
      drawV = 3
      break
    default:
      drawH = isWide ? 3 : 1
      drawV = isWide ? 1 : 3
  }

  return {
    horizontalSlots: Math.max(cutH, shuffleH, drawH),
    verticalSlots: Math.max(cutV, shuffleV, drawV),
  }
}
