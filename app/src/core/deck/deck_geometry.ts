/**
 * Name: core/deck/deck_geometry
 * Purpose: deck geometry types for layout calculations.
 * Reason: decouple deck positioning from animation state.
 */

export interface DeckCardOffset {
  x: number
  y: number
}

export interface DeckGeometry {
  centerX: number
  centerY: number
  cardOffsetStep: DeckCardOffset
  totalOffset: DeckCardOffset
}
