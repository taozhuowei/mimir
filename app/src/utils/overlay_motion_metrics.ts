/**
 * Name: overlay_motion_metrics
 * Purpose: single source of truth for every distance the overlay flow needs —
 *   card size, gap, shuffle spread, cut pile spacing and safe half-spans.
 * Reason: card sizing, position resolution, shuffle/cut animations and pile rendering
 *   all derive from the SAME safe-frame + envelope inputs, so any screen size yields
 *   a consistent set of distances and no animation can disagree about its bounds.
 * Data flow: safe frame + spread/cut requirements flow in; concrete distances flow out.
 */

import {
  getSpreadEnvelopeRequirement,
  resolveOverlayCardEnvelope,
  type CardEnvelope,
  type CardEnvelopeRequirement,
} from './overlay_card_envelope'
import type { SpreadKind } from './overlay_layout_types'

export type CutAxis = 'horizontal' | 'vertical'

export interface OverlayMotionMetricsInput {
  safeWidth: number
  safeHeight: number
  cardAspectRatio: number
  spreadKind: SpreadKind
  isWide: boolean
  /** Number of piles produced by the cut animation. Must be >= 1; defaults handled by caller. */
  cutPileCount: number
  /** Total number of cards in the deck (used to size each pile during cut). */
  deckCount: number
  /** Optional: extend the envelope requirement to fit additional spread layouts. */
  envelopeOverride?: CardEnvelopeRequirement
}

export interface OverlayMotionMetrics {
  envelope: CardEnvelope
  cardWidth: number
  cardHeight: number
  gap: number
  /** Half-span the safe frame can support (= safeWidth / 2). */
  safeHalfWidth: number
  /** Half-span the safe frame can support (= safeHeight / 2). */
  safeHalfHeight: number
  /** Distance from centre to outer shuffle group. Wider screens spread further. */
  shuffleSpreadX: number
  /** Adjacent cut pile centres are this far apart along the cut axis. */
  cutPileSpacing: number
  /** The axis along which cut piles are arranged (horizontal on wide, vertical on narrow). */
  cutAxis: CutAxis
  /** Cards rendered per cut pile (= floor(deckCount / cutPileCount)). */
  cardsPerPile: number
  /** Tween offset for the leading cut pile (top / left). */
  cutLeadingOffset: { x: number; y: number }
  /** Tween offset for the trailing cut pile (bottom / right). */
  cutTrailingOffset: { x: number; y: number }
}

/**
 * Resolve every distance the overlay's animations and layouts need.
 * Card sizing comes from the spread envelope (worst-case slot grid).
 * Shuffle and cut distances are derived from that envelope so they never overflow,
 * but they expand to use leftover safe-frame space when available.
 */
export function resolveOverlayMotionMetrics(input: OverlayMotionMetricsInput): OverlayMotionMetrics {
  const {
    safeWidth,
    safeHeight,
    cardAspectRatio,
    spreadKind,
    isWide,
    cutPileCount,
    deckCount,
    envelopeOverride,
  } = input

  const spreadRequirement = envelopeOverride ?? getSpreadEnvelopeRequirement(spreadKind, isWide)
  // Cut piles place an extra constraint on the same axis they spread along.
  const cutAxis: CutAxis = isWide ? 'horizontal' : 'vertical'
  const cutHorizontalSlots = cutAxis === 'horizontal' ? Math.max(cutPileCount, 1) : 1
  const cutVerticalSlots = cutAxis === 'vertical' ? Math.max(cutPileCount, 1) : 1

  const envelope = resolveOverlayCardEnvelope({
    safeWidth,
    safeHeight,
    cardAspectRatio,
    horizontalSlots: Math.max(spreadRequirement.horizontalSlots, cutHorizontalSlots),
    verticalSlots: Math.max(spreadRequirement.verticalSlots, cutVerticalSlots),
  })

  const { cardWidth, cardHeight, gap, slotPitchX, slotPitchY } = envelope
  const safeHalfWidth = safeWidth / 2
  const safeHalfHeight = safeHeight / 2

  // Shuffle spread: at least envelope.slotPitchX/2 (so 2 cards fit), at most
  // edge-of-safe-frame minus a small margin. Default target hugs ~1 card width
  // so wide screens really do feel "spread out".
  const shuffleEdgeMargin = 12
  const minShuffleSpread = slotPitchX / 2
  const maxShuffleSpread = Math.max(minShuffleSpread, safeHalfWidth - cardWidth / 2 - shuffleEdgeMargin)
  const targetShuffleSpread = cardWidth + gap
  const shuffleSpreadX = clamp(targetShuffleSpread, minShuffleSpread, maxShuffleSpread)

  // Cut pile spacing: spread evenly along the cut axis.
  // Min = envelope's pitch (one card width/height + gap) so adjacent piles don't overlap.
  // Max = (safeAxis - cardAxisSize) / (N-1) so even the outermost pile's edge stays inside.
  const pilesAlongAxis = Math.max(1, cutPileCount)
  const cutAxisAvailable = cutAxis === 'horizontal' ? safeWidth : safeHeight
  const cutAxisCardSize = cutAxis === 'horizontal' ? cardWidth : cardHeight
  const minPileSpacing = cutAxis === 'horizontal' ? slotPitchX : slotPitchY
  const cutAxisSlackEachSide = (cutAxisAvailable - cutAxisCardSize) / 2
  const maxPileSpacing = pilesAlongAxis > 1
    ? Math.max(minPileSpacing, (cutAxisAvailable - cutAxisCardSize) / (pilesAlongAxis - 1) - 4)
    : minPileSpacing
  const targetPileSpacing = cutAxisCardSize + Math.min(gap * 1.4, cutAxisSlackEachSide / 4 + gap)
  const cutPileSpacing = clamp(targetPileSpacing, minPileSpacing, maxPileSpacing)

  const halfRange = ((pilesAlongAxis - 1) / 2) * cutPileSpacing
  const cutLeadingOffset = cutAxis === 'horizontal'
    ? { x: -halfRange, y: 0 }
    : { x: 0, y: -halfRange }
  const cutTrailingOffset = cutAxis === 'horizontal'
    ? { x: halfRange, y: 0 }
    : { x: 0, y: halfRange }

  const cardsPerPile = Math.max(1, Math.floor(Math.max(1, deckCount) / pilesAlongAxis))

  return {
    envelope,
    cardWidth,
    cardHeight,
    gap,
    safeHalfWidth,
    safeHalfHeight,
    shuffleSpreadX,
    cutPileSpacing,
    cutAxis,
    cardsPerPile,
    cutLeadingOffset,
    cutTrailingOffset,
  }
}

/**
 * Compute the resting position (centre) of a single cut pile within the cut layout.
 * Piles are laid out symmetrically around (0,0) along the cut axis.
 */
export function getCutPileRestPosition(
  pileIndex: number,
  pileCount: number,
  pileSpacing: number,
  axis: CutAxis,
): { x: number; y: number } {
  const offset = (pileIndex - (pileCount - 1) / 2) * pileSpacing
  return axis === 'horizontal' ? { x: offset, y: 0 } : { x: 0, y: offset }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
