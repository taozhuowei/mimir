/**
 * Name: core/sizing/layout_solver
 * Purpose: single physical-pixel layout solver for the tarot reading flow.
 *          Given a viewport + UI reservations + scene kind, returns a fully
 *          described SceneLayout (card rects, drawer geometry, stage rect,
 *          envelope) with no hidden ratios.
 * Reason: the previous code spread layout decisions across multiple modules
 *         (overlay_layout, spread_layout, scene_layout, draw/result resolvers)
 *         using semantic 0.x ratios (RESULT_WIDE_WIDTH_FRACTION 0.54,
 *         BOTTOM_RATIO_DRAW 0.12, ...). Those numbers couldn't be reasoned
 *         about — they expressed neither pixels nor any explicit physical
 *         meaning. This module replaces all of them with pixel reservations
 *         so each derived value is auditable and editable from one place.
 *
 * Purity: pure function. No window access, no DOM, no global state. The
 *         caller is responsible for collecting the viewport + reservations.
 *
 * Data flow:
 *   getViewport(windowInfo) ──┐
 *                              ├──▶ solveLayout({viewport, reservations, scene}) ──▶ SceneLayout
 *   getDefaultReservations() ─┘
 */

import { clamp } from '../../utils/math'
import type { PhysicalViewport, UiReservations } from './physical_reservations'

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
  /** Initial drawer height (= viewport.height - initialTop on narrow). */
  initialHeight: number
  /** Maximum drawer height when fully expanded. */
  maxHeight: number
  /** Drawer width in px. */
  width: number
  /** True when drawer is anchored to the right side (wide screens). */
  rightAligned: boolean
}

/**
 * Sizing envelope for shuffle/cut motion bounds. Always derived from the
 * draw-stage worst-case slot grid so animations stay inside the safe frame
 * regardless of which scene we're currently rendering.
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
  /** Vertical offset applied to the stage layer. 0 for draw stage. */
  stageShiftY: number
  // ----- new fields -----
  stage: StageRect
  drawer: DrawerGeometry
  envelope: LayoutEnvelope
}

export type SceneKind = 'draw_stage' | 'reading_stage'

export interface SolveLayoutInput {
  viewport: PhysicalViewport
  reservations: UiReservations
  scene: SceneKind
}

// ---------------------------------------------------------------------------
// Solver — split into stage-specific helpers so each one stays well below
// the project's per-function size cap. The public `solveLayout` just wires
// them together in the order documented above.
// ---------------------------------------------------------------------------

/** Vertical budget shared by both stages (header + footer + safe-areas). */
function computeAvailableHeight(viewport: PhysicalViewport, reservations: UiReservations): number {
  return (
    viewport.height -
    viewport.topBarHeight -
    viewport.safeAreaTop -
    reservations.headerHeight -
    reservations.actionBarHeight -
    viewport.safeAreaBottom
  )
}

/**
 * Uniform draw-stage card size: chosen against the worst-case slot grid
 * (cut phase needs 3 piles), so the same value is valid across shuffle,
 * cut and draw — cards never visibly resize between phases.
 *
 * Spacing budget along each axis:
 *   total_axis = N × cardSize + (N − 1) × gap_between + 2 × gap_breathing
 *              = N × cardSize + (N + 1) × gap
 * The two extra `gap`s are the breathing buffers on the leading and
 * trailing edges of the card grid, so the topmost cut pile keeps a
 * `gap`-sized clearance from the header (and the same on the bottom /
 * sides depending on cut axis). Without them, the cut animation can
 * push cards visually into the header icons.
 */
function computeDrawCardSize(
  viewport: PhysicalViewport,
  reservations: UiReservations,
  availableH: number,
): { width: number; height: number; cols: number; rows: number } {
  const cols = viewport.isWide ? 3 : 1
  const rows = viewport.isWide ? 1 : 3
  const availableW = viewport.width - 2 * reservations.cardSideMargin
  const cwByW = (availableW - (cols + 1) * reservations.cardGap) / cols
  const cwByH =
    (availableH - (rows + 1) * reservations.cardGap) / rows / reservations.cardAspectRatio
  const width = clamp(
    Math.min(cwByW, cwByH),
    reservations.minCardWidth,
    reservations.maxCardWidth,
  )
  return { width, height: width * reservations.cardAspectRatio, cols, rows }
}

/**
 * Result-stage card size + screen rectangle. Vertical budget on narrow
 * screens leaves room for the drawer's minimum initial height, minus the
 * overlap pixels the card is allowed to sit under.
 *
 * The single card has the same `gap`-sized breathing on every side as the
 * draw-stage grid: we subtract `2 * gap` from the available width and
 * height before solving so the result card never sits flush against the
 * header, side margin, or drawer edge.
 */
function computeResultCardLayout(
  viewport: PhysicalViewport,
  reservations: UiReservations,
  availableH: number,
): {
  width: number
  height: number
  topScreenY: number
  bottomScreenY: number
} {
  const stageW = viewport.isWide ? viewport.width - reservations.drawerWideWidth : viewport.width
  const availableW = stageW - 2 * reservations.cardSideMargin
  const budgetH = viewport.isWide
    ? availableH
    : availableH - reservations.drawerMinInitialHeight + reservations.drawerCardOverlap

  const cwByW = availableW - 2 * reservations.cardGap
  const cwByH = (budgetH - 2 * reservations.cardGap) / reservations.cardAspectRatio
  const width = clamp(
    Math.min(cwByW, cwByH),
    reservations.minCardWidth,
    reservations.maxCardWidth,
  )
  const height = width * reservations.cardAspectRatio
  const topScreenY =
    viewport.topBarHeight + viewport.safeAreaTop + reservations.headerHeight + (budgetH - height) / 2
  return { width, height, topScreenY, bottomScreenY: topScreenY + height }
}

/** Drawer geometry: side panel on wide, bottom sheet on narrow. */
function computeDrawer(
  viewport: PhysicalViewport,
  reservations: UiReservations,
  cardBottomScreenY: number,
): DrawerGeometry {
  if (viewport.isWide) {
    return {
      initialTop: 0,
      initialHeight: viewport.height,
      maxHeight: viewport.height,
      width: reservations.drawerWideWidth,
      rightAligned: true,
    }
  }
  const initialTop = cardBottomScreenY - reservations.drawerCardOverlap
  return {
    initialTop,
    initialHeight: viewport.height - initialTop,
    maxHeight: viewport.height,
    width: viewport.width,
    rightAligned: false,
  }
}

/** Stage rectangle in viewport-absolute px. */
function computeStage(
  viewport: PhysicalViewport,
  reservations: UiReservations,
  scene: SceneKind,
): StageRect {
  const isResultWide = scene === 'reading_stage' && viewport.isWide
  return {
    x: 0,
    y: viewport.topBarHeight,
    width: isResultWide ? viewport.width - reservations.drawerWideWidth : viewport.width,
    height: viewport.height - viewport.topBarHeight,
  }
}

/** Worst-case slot grid envelope, used by animation bounds in every scene. */
function computeEnvelope(
  drawCardWidth: number,
  drawCardHeight: number,
  cols: number,
  rows: number,
  gap: number,
): LayoutEnvelope {
  const fullSpanX = cols * drawCardWidth + (cols - 1) * gap
  const fullSpanY = rows * drawCardHeight + (rows - 1) * gap
  return {
    cardWidth: drawCardWidth,
    cardHeight: drawCardHeight,
    gap,
    horizontalSlots: cols,
    verticalSlots: rows,
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
 *  1. Compute draw-stage card size from the worst-case 3-pile grid.
 *  2. Compute result-stage card size + on-screen rect (drawer-aware).
 *  3. Compute drawer + stage geometry from those rects.
 *  4. Compose the scene-specific output, preserving legacy field names.
 */
export function solveLayout(input: SolveLayoutInput): SceneLayout {
  const { viewport, reservations, scene } = input

  const availableH = computeAvailableHeight(viewport, reservations)
  const draw = computeDrawCardSize(viewport, reservations, availableH)
  const result = computeResultCardLayout(viewport, reservations, availableH)
  const drawer = computeDrawer(viewport, reservations, result.bottomScreenY)
  const stage = computeStage(viewport, reservations, scene)
  const envelope = computeEnvelope(
    draw.width,
    draw.height,
    draw.cols,
    draw.rows,
    reservations.cardGap,
  )

  if (scene === 'reading_stage') {
    const stageCenterY = stage.y + stage.height / 2
    const stageShiftY = result.topScreenY + result.height / 2 - stageCenterY
    const cards: CardLayout[] = [
      {
        slotId: 'center',
        x: 0,
        y: stageShiftY,
        width: result.width,
        height: result.height,
        rotateDeg: 0,
        zIndex: 1,
      },
    ]
    return {
      cards,
      cardWidth: result.width,
      cardHeight: result.height,
      drawCardWidth: draw.width,
      drawCardHeight: draw.height,
      stageShiftY,
      stage,
      drawer,
      envelope,
    }
  }

  // draw_stage: single centered slot at (0, 0). Concrete shuffle / cut /
  // draw phases position the deck themselves; this is the rest layout.
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
