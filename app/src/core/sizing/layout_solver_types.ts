/**
 * Name: core/sizing/layout_solver/types
 * Purpose: output / input types for the layout solver. Holds the
 *          interfaces (`CardLayout`, `DrawerGeometry`, `LayoutEnvelope`,
 *          `StageRect`, `SceneLayout`, `SceneKind`, `SolveLayoutInput`)
 *          shared by the per-scene computers and the public solver
 *          facade.
 * Reason: extracted from the monolithic `layout_solver.ts` (was 345
 *          lines) so the type surface stays small and importable
 *          without dragging in the imperative solver code. Type-only
 *          consumers (style_reconciler, composables, views) keep their
 *          existing imports because the facade re-exports everything.
 */

import type { PhysicalViewport, ResponsiveSizes } from './scale'

/**
 * Single card placement on the stage. Coordinates are stage-relative with the
 * origin at the stage center (matches the existing style_reconciler contract).
 */
export interface CardLayout {
  slotId: string
  /** Stage-relative x of card center, origin = stage center. */
  x: number
  /** Stage-relative y of card center, origin = stage center. */
  y: number
  /** Card width in px. */
  width: number
  /** Card height in px. */
  height: number
  /** Card rotation in degrees. */
  rotateDeg: number
  /** Stack order. */
  zIndex: number
}

/**
 * Solver output describing the bottom region the answer occupies, in
 * viewport-absolute px. Historically a draggable bottom-sheet "drawer";
 * the pivot replaced it with an inline answer zone, so these values now
 * just describe that reserved bottom band. The shape (and whether to
 * simplify it post-pivot) is parked as F6 of the parked-debt plan.
 */
export interface DrawerGeometry {
  /** Distance from viewport top to the reserved region's top edge. */
  initialTop: number
  /** Reserved region height (= viewport.height - safeAreaBottom - initialTop). */
  initialHeight: number
  /** Max region height. */
  maxHeight: number
  /** Region width in px. */
  width: number
  /**
   * Always false: the answer zone is an inline bottom region, never a
   * right-aligned panel. Retained as part of the output contract.
   */
  rightAligned: boolean
}

/**
 * Sizing envelope for shuffle/cut motion bounds. Always derived from the
 * 3-pile draw-stage grid so animations stay inside the safe frame regardless
 * of which scene we're currently rendering.
 */
export interface LayoutEnvelope {
  cardWidth: number
  cardHeight: number
  gap: number
  horizontalSlots: number
  verticalSlots: number
  /** Distance between slot centers along x (= cardWidth + gap). */
  slotPitchX: number
  /** Distance between slot centers along y (= cardHeight + gap). */
  slotPitchY: number
  /** Half of the total horizontal extent of the slot grid. */
  halfSpanX: number
  /** Half of the total vertical extent of the slot grid. */
  halfSpanY: number
  /** Total horizontal extent of the slot grid. */
  fullSpanX: number
  /** Total vertical extent of the slot grid. */
  fullSpanY: number
}

/** Stage rectangle on the viewport (absolute px coordinates). */
export interface StageRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Full scene layout. Field names `cards`, `cardWidth`, `cardHeight`,
 * `drawCardWidth`, `drawCardHeight`, `stageShiftY` are preserved because
 * style_reconciler.ts depends on them.
 */
export interface SceneLayout {
  // ----- preserved field names (style_reconciler.ts depends on these) -----
  cards: CardLayout[]
  /**
   * Card width for the current scene. On the answer scene this is the
   * size computed against the stage rect that already reserves the
   * bottom inline answer-zone + action-area band; the reveal pipeline
   * targets this size directly so the card never overflows the stage.
   */
  cardWidth: number
  /** Card height for the current scene (see `cardWidth` for semantics). */
  cardHeight: number
  /** Uniform draw-stage card width (shuffle / cut / draw share this size). */
  drawCardWidth: number
  /** Uniform draw-stage card height. */
  drawCardHeight: number
  /**
   * Vertical offset applied to the stage layer. Always 0 in the new model
   * — the card is centred in the stage rect on every scene, so no shift
   * is required to align the result card with the draw card.
   */
  stageShiftY: number
  // ----- new fields -----
  stage: StageRect
  drawer: DrawerGeometry
  envelope: LayoutEnvelope
}

export type SceneKind = 'draw_stage' | 'answer_stage'

export interface SolveLayoutInput {
  viewport: PhysicalViewport
  sizes: ResponsiveSizes
  scene: SceneKind
}
