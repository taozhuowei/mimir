/**
 * Name: core/sizing/physical_reservations
 * Purpose: physical-pixel reservations for the layout solver.
 *          Every value is a concrete number of pixels with a physical meaning
 *          (header height, action-bar height, card gap, drawer overlap, ...).
 * Reason: previous layout code mixed semantic ratios (RESULT_WIDE_WIDTH_FRACTION
 *         0.54, BOTTOM_RATIO_DRAW 0.12 etc.) which were impossible to reason
 *         about — what does "0.54" of which dimension actually mean? Switching
 *         to absolute pixels makes intent legible and a single source-of-truth
 *         change propagates correctly through the solver.
 *
 * Data flow: viewport metrics + these reservations → layout_solver.solveLayout.
 */
// Note: the wide-screen breakpoint constant lives in
// `core/config/layout_constants.ts`. Callers that need both the breakpoint
// and these reservations should import each from its canonical module —
// re-exporting here would create a duplicate symbol the quality scanner
// flags and would obscure the source of truth.
import { WIDE_BREAKPOINT } from '../config/layout_constants'

// ---------------------------------------------------------------------------
// Input types for the physical layout solver.
// ---------------------------------------------------------------------------

/**
 * Physical viewport metrics — every field is a number of CSS pixels.
 * `isWide` is precomputed so consumers don't have to remember the threshold.
 */
export interface PhysicalViewport {
  /** Viewport width in px. */
  width: number
  /** Viewport height in px. */
  height: number
  /** Top safe-area inset (notch / status bar) in px. */
  safeAreaTop: number
  /** Bottom safe-area inset (gesture bar) in px. */
  safeAreaBottom: number
  /** Mini-program capsule / top bar height in px. 0 for H5. */
  topBarHeight: number
  /** True when width >= WIDE_BREAKPOINT (768). */
  isWide: boolean
}

/**
 * UI reservation budget — every field is a number of CSS pixels.
 * Reservations are subtracted from the viewport before card sizing runs.
 */
export interface UiReservations {
  /** Progress header height (px). */
  headerHeight: number
  /** Bottom action bar height (excl. safeAreaBottom) (px). */
  actionBarHeight: number
  /** Inter-card gap (px). */
  cardGap: number
  /** Stage left/right margin (px). */
  cardSideMargin: number
  /** Drawer top covers the result card bottom by this many px. */
  drawerCardOverlap: number
  /** Drawer width on wide screens (px). */
  drawerWideWidth: number
  /** Minimum drawer initial height on narrow screens (px). */
  drawerMinInitialHeight: number
  /** Card width legibility lower bound (px). */
  minCardWidth: number
  /** Card width legibility upper bound (px). */
  maxCardWidth: number
  /** Card aspect ratio (height / width), dimensionless. */
  cardAspectRatio: number
}

// ---------------------------------------------------------------------------
// Default physical reservations (px). Derived from H5 design + measurements.
// ---------------------------------------------------------------------------

/** Progress header total height: top padding + 44px icon + label + bottom padding. */
const DEFAULT_HEADER_HEIGHT = 80

/** Bottom action bar height (excluding device safe-area inset). */
const DEFAULT_ACTION_BAR_HEIGHT = 96

/** Inter-card gap. Also used as left/right margin for visual balance. */
const DEFAULT_CARD_GAP = 16

/** Side margin on the stage edges. Defaults to gap so the rhythm stays even. */
const DEFAULT_CARD_SIDE_MARGIN = 16

/**
 * How many pixels the result drawer overlaps the bottom of the result card.
 * Creates the "drawer is anchored to the card" visual relationship.
 */
const DEFAULT_DRAWER_CARD_OVERLAP = 24

/** Drawer width on wide screens (right-side static panel). */
const DEFAULT_DRAWER_WIDE_WIDTH = 480

/**
 * Minimum initial height of the bottom-sheet drawer on narrow screens.
 * Guarantees the drawer is always tall enough to be useful even when
 * the result card consumes most of the vertical space.
 */
const DEFAULT_DRAWER_MIN_INITIAL_HEIGHT = 220

/** Legibility lower bound for card width — anything smaller is unreadable. */
const DEFAULT_MIN_CARD_WIDTH = 64

/** Legibility upper bound for card width — anything larger feels comical. */
const DEFAULT_MAX_CARD_WIDTH = 512

/** Card aspect ratio (height / width) — tarot cards are tall. */
const DEFAULT_CARD_ASPECT_RATIO = 1.6

/**
 * Returns the project-wide default UI reservations.
 *
 * Pure function: same defaults every call. If a future caller needs to tweak
 * a single value (e.g. tighter side margins on a specific screen) it should
 * spread the result and override the relevant key.
 */
export function getDefaultReservations(): UiReservations {
  return {
    headerHeight: DEFAULT_HEADER_HEIGHT,
    actionBarHeight: DEFAULT_ACTION_BAR_HEIGHT,
    cardGap: DEFAULT_CARD_GAP,
    cardSideMargin: DEFAULT_CARD_SIDE_MARGIN,
    drawerCardOverlap: DEFAULT_DRAWER_CARD_OVERLAP,
    drawerWideWidth: DEFAULT_DRAWER_WIDE_WIDTH,
    drawerMinInitialHeight: DEFAULT_DRAWER_MIN_INITIAL_HEIGHT,
    minCardWidth: DEFAULT_MIN_CARD_WIDTH,
    maxCardWidth: DEFAULT_MAX_CARD_WIDTH,
    cardAspectRatio: DEFAULT_CARD_ASPECT_RATIO,
  }
}

// ---------------------------------------------------------------------------
// Viewport adapter
// ---------------------------------------------------------------------------

/**
 * Shape of the platform-supplied window info we accept.
 * Kept structurally typed so callers can pass `uni.getWindowInfo()` results
 * (mini-program) or H5 window measurements without an explicit conversion.
 */
export interface WindowInfoShape {
  windowWidth: number
  windowHeight: number
  safeAreaInsets?: { top?: number; bottom?: number; left?: number; right?: number }
  /**
   * Mini-program capsule / status-bar height. Pass 0 (or omit) on H5.
   */
  topBarHeight?: number
}

/**
 * Adapt a platform window-info object into the solver's PhysicalViewport.
 *
 * Pure / side-effect free: does not call uni APIs or read globals — the
 * caller is responsible for fetching the window info first. This keeps the
 * function trivially testable.
 */
export function getViewport(windowInfo: WindowInfoShape): PhysicalViewport {
  const width = Math.max(0, Math.floor(windowInfo.windowWidth))
  const height = Math.max(0, Math.floor(windowInfo.windowHeight))
  const safeAreaTop = Math.max(0, Math.floor(windowInfo.safeAreaInsets?.top ?? 0))
  const safeAreaBottom = Math.max(0, Math.floor(windowInfo.safeAreaInsets?.bottom ?? 0))
  const topBarHeight = Math.max(0, Math.floor(windowInfo.topBarHeight ?? 0))

  return {
    width,
    height,
    safeAreaTop,
    safeAreaBottom,
    topBarHeight,
    isWide: width >= WIDE_BREAKPOINT,
  }
}
