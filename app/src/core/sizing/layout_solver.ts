/**
 * Name: core/sizing/layout_solver
 * Purpose: pure layout solver for the tarot reading flow. Given a viewport,
 *          ResponsiveSizes, and a scene kind, returns a fully described
 *          SceneLayout (card rects, drawer geometry, stage rect, animation
 *          envelope) — every value derived from a single 1:1.6 stage rect
 *          centered horizontally in the canvas.
 * Reason: previous versions held a tiered "physical reservations" budget
 *         (physical_reservations.ts) that branched on `viewport.isWide` and
 *         carried bespoke fields like `drawerWideWidth`, `drawerCardOverlap`,
 *         `cardSideMargin`. The proportional `ResponsiveSizes` model
 *         (core/sizing/scale.ts) is now the single source of truth for
 *         spacing, so the solver becomes a flat function of those sizes
 *         plus the viewport. The wide-split branching is gone — the drawer
 *         always overlays the bottom of the stage as a sheet; the wide-screen
 *         side-column UI is handled at the view layer (ReadingSplitView)
 *         and is not visible to the solver.
 *
 * Purity: pure function. No window access, no DOM, no global state. The
 *         caller is responsible for collecting the viewport and sizes.
 *
 * Data flow:
 *   readViewport(windowInfo) ──▶ pickCanvasWidth ──┐
 *                                                  ├──▶ solveLayout({viewport, sizes, scene}) ──▶ SceneLayout
 *   deriveSizes(canvasWidth) ───────────────────────┘
 */

import type { PhysicalViewport, ResponsiveSizes } from './scale'
import { CARD_ASPECT_RATIO } from './scale'

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

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

/** Drawer placement and size, in viewport-absolute px coordinates. */
export interface DrawerGeometry {
  /** Distance from the top of the viewport to the drawer's initial top edge. */
  initialTop: number
  /** Initial drawer height (= viewport.height - safeAreaBottom - initialTop). */
  initialHeight: number
  /** Maximum drawer height when fully expanded. */
  maxHeight: number
  /** Drawer width in px. */
  width: number
  /**
   * True when drawer is anchored to the right side. Always false in the new
   * model (drawer is always a bottom sheet) — the field is kept so consumers
   * that branch on it continue to compile until the wide-split UI is removed
   * in a later step.
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
  /** Card width for the current scene. */
  cardWidth: number
  /** Card height for the current scene. */
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

export type SceneKind = 'draw_stage' | 'reading_stage'

export interface SolveLayoutInput {
  viewport: PhysicalViewport
  sizes: ResponsiveSizes
  scene: SceneKind
}

// ---------------------------------------------------------------------------
// Solver — split into small helpers so each piece is auditable on its own.
// The public `solveLayout` wires them together in the order documented above.
// ---------------------------------------------------------------------------

/**
 * Compute the largest 1:1.6 stage rect that fits inside the canvas after
 * subtracting the header and the page margins on every side. The stage is
 * the visual region cards live in — it doubles as the result card rect on
 * the reading scene because there's exactly one card and the card fills it.
 */
function computeStage(
  viewport: PhysicalViewport,
  sizes: ResponsiveSizes,
): StageRect {
  const availableW = viewport.width - 2 * sizes.margin
  const availableH =
    viewport.height -
    viewport.safeAreaTop -
    viewport.safeAreaBottom -
    2 * sizes.margin -
    sizes.headerHeight

  // Largest 1:1.6 (height/width) rect that fits in (availableW × availableH).
  // If the canvas is wide-and-short, height is the limiting dimension.
  const widthLimitedByH = availableH / CARD_ASPECT_RATIO
  const stageW = Math.min(availableW, widthLimitedByH)
  const stageH = stageW * CARD_ASPECT_RATIO

  // Centre the stage horizontally in the canvas; pin it below the header
  // (which itself sits below the safe-area top + page margin).
  const stageX = (viewport.width - stageW) / 2
  const stageY = viewport.safeAreaTop + sizes.margin + sizes.headerHeight

  return { x: stageX, y: stageY, width: stageW, height: stageH }
}

/**
 * Three-pile draw card size. The cut phase requires three piles laid out
 * horizontally inside the stage with a `gap` of breathing on each end and
 * between piles, so each pile gets `(stageW − 4 × gap) / 3`. The card is
 * still 1:1.6, so height follows.
 */
function computeDrawCardSize(stage: StageRect, sizes: ResponsiveSizes): {
  width: number
  height: number
} {
  const width = (stage.width - 4 * sizes.gap) / 3
  return { width, height: width * CARD_ASPECT_RATIO }
}

/**
 * Drawer geometry in the new model: always a bottom sheet that opens from
 * the bottom of the stage and stretches to the bottom of the viewport
 * (above the safe-area inset). Width spans the full canvas.
 */
function computeDrawer(viewport: PhysicalViewport, stage: StageRect): DrawerGeometry {
  const initialTop = stage.y + stage.height
  const initialHeight = viewport.height - initialTop - viewport.safeAreaBottom
  const maxHeight = viewport.height - viewport.safeAreaBottom
  return {
    initialTop,
    initialHeight,
    maxHeight,
    width: viewport.width,
    rightAligned: false,
  }
}

/**
 * Animation envelope for the 3-pile draw / cut grid. Always horizontal in
 * the new model — the wide / narrow rotation of the grid is gone because
 * the stage rect is a single shape on every viewport.
 */
function computeEnvelope(
  drawCardWidth: number,
  drawCardHeight: number,
  gap: number,
): LayoutEnvelope {
  const horizontalSlots = 3
  const verticalSlots = 1
  const fullSpanX = horizontalSlots * drawCardWidth + (horizontalSlots - 1) * gap
  const fullSpanY = drawCardHeight
  return {
    cardWidth: drawCardWidth,
    cardHeight: drawCardHeight,
    gap,
    horizontalSlots,
    verticalSlots,
    slotPitchX: drawCardWidth + gap,
    slotPitchY: drawCardHeight + gap,
    halfSpanX: fullSpanX / 2,
    halfSpanY: fullSpanY / 2,
    fullSpanX,
    fullSpanY,
  }
}

/**
 * Solve the layout for one scene.
 *
 * Pure function: identical inputs produce identical outputs, no side effects.
 *
 * Strategy
 * ────────
 *  1. Compute the stage rect — largest 1:1.6 box that fits the canvas after
 *     subtracting margins, header, and safe areas. The stage is centered
 *     horizontally and pinned below the header.
 *  2. Compute the 3-pile draw card size from the stage (one card per pile).
 *  3. Compose the result-stage card (= stage rect — single card fills it).
 *  4. Compute drawer geometry as a bottom sheet anchored to the stage bottom.
 *  5. Build the animation envelope from the draw card size.
 */
export function solveLayout(input: SolveLayoutInput): SceneLayout {
  const { viewport, sizes, scene } = input

  const stage = computeStage(viewport, sizes)
  const draw = computeDrawCardSize(stage, sizes)
  const drawer = computeDrawer(viewport, stage)
  const envelope = computeEnvelope(draw.width, draw.height, sizes.gap)

  // Result card == stage rect (single card fills the entire stage).
  const resultCardWidth = stage.width
  const resultCardHeight = stage.height

  // Cards array: one centred placeholder. Concrete shuffle / cut / draw /
  // reveal phases position individual cards themselves; the solver only
  // emits a rest layout the controller can use as a fallback.
  if (scene === 'reading_stage') {
    const cards: CardLayout[] = [
      {
        slotId: 'center',
        x: 0,
        y: 0,
        width: resultCardWidth,
        height: resultCardHeight,
        rotateDeg: 0,
        zIndex: 1,
      },
    ]
    return {
      cards,
      cardWidth: resultCardWidth,
      cardHeight: resultCardHeight,
      drawCardWidth: draw.width,
      drawCardHeight: draw.height,
      stageShiftY: 0,
      stage,
      drawer,
      envelope,
    }
  }

  // draw_stage: single centered slot at (0, 0) using the draw card size.
  const cards: CardLayout[] = [
    {
      slotId: 'center',
      x: 0,
      y: 0,
      width: draw.width,
      height: draw.height,
      rotateDeg: 0,
      zIndex: 1,
    },
  ]
  return {
    cards,
    cardWidth: draw.width,
    cardHeight: draw.height,
    drawCardWidth: draw.width,
    drawCardHeight: draw.height,
    stageShiftY: 0,
    stage,
    drawer,
    envelope,
  }
}
