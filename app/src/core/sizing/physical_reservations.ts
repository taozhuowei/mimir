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

/**
 * Legibility lower bound for card width.
 *
 * Sized so the cut-phase 1×3 envelope on the tightest supported viewport
 * — iPhone SE 2/3 at 375×667, regular tier (gap=20) — still fits without
 * overflow. The math: with availH = 491 (667 − 80 header − 96 action bar)
 * and three rows separated by two 20-px gaps, the per-card height ceiling
 * is (491 − 40) / 3 = 150.3, which at aspect 1.6 caps the card width at
 * ~93 px. Pinning min at 88 leaves a small margin and rounds to a friendly
 * multiple of 4. Galaxy S22 (360×800), iPhone Pro Max (430×932) and every
 * larger device land well above this floor naturally; the clamp is a
 * legibility contract, not a fitting rule.
 *
 * Devices smaller than 375 wide and shorter than ~660 tall (e.g. iPhone
 * SE 1, very old Android) are out of scope and may overflow.
 */
const DEFAULT_MIN_CARD_WIDTH = 88

/**
 * Aesthetic upper bound for card width.
 *
 * A real Rider–Waite tarot card is ~70mm × 112mm, roughly 264 × 422 px on
 * a 96 dpi display. Capping at 260 keeps a "hand-held printed card"
 * feeling on every viewport — large screens grow the breathing space, not
 * the card itself.
 */
const DEFAULT_MAX_CARD_WIDTH = 260

/** Card aspect ratio (height / width) — tarot cards are tall. */
const DEFAULT_CARD_ASPECT_RATIO = 1.6

// ---------------------------------------------------------------------------
// Stepped spacing tiers.
//
// Card gap and stage side-margin share the same value at every tier so the
// visual rhythm reads as one rule ("breathing"), not two. The values change
// in 4-px steps from 16 to 24 — small enough that crossing a tier never
// feels like a jump, large enough that the largest screens get noticeably
// looser breathing than the smallest.
//
// Why three tiers, not a continuous function:
//   Discrete tiers are auditable (designers and reviewers can reason about
//   "compact / regular / wide"); a continuous function would mean every
//   pixel of viewport width quietly nudges the layout, which makes
//   regressions harder to attribute and design reviews harder to stage.
// ---------------------------------------------------------------------------

/** Tiered spacing values (px). `gap === sideMargin` at every tier by design. */
const SPACING_TIER = {
  compact: { gap: 16, sideMargin: 16 },
  regular: { gap: 20, sideMargin: 20 },
  wide:    { gap: 24, sideMargin: 24 },
} as const

/** Upper bound (exclusive) of the compact tier in px. */
const COMPACT_TIER_MAX = 375
/** Upper bound (exclusive) of the regular tier in px. Matches WIDE_BREAKPOINT. */
const REGULAR_TIER_MAX = WIDE_BREAKPOINT // 768

type SpacingTierName = keyof typeof SPACING_TIER

/**
 * Resolve the spacing tier for a viewport width.
 *
 * Exported so tests and tooling can sanity-check a viewport's tier without
 * having to keep its own copy of the breakpoints. The mapping is:
 *   width <  375 → compact   (e.g. Galaxy S22/S23 360×800)
 *   width <  768 → regular   (e.g. iPhone SE 375, iPhone 12 390, Pro Max 430)
 *   width >= 768 → wide      (iPad portrait, desktops)
 */
export function pickSpacingTier(width: number): SpacingTierName {
  if (width < COMPACT_TIER_MAX) return 'compact'
  if (width < REGULAR_TIER_MAX) return 'regular'
  return 'wide'
}

/**
 * Returns the project-wide default UI reservations.
 *
 * Pass `viewportWidth` to receive tiered card-gap / side-margin values for
 * that screen. Omitting the argument falls back to the regular tier
 * (representative of mainstream phones); legacy callers that don't yet
 * know their viewport keep working without a one-line breaking change.
 *
 * Pure function: same input always produces the same output.
 */
export function getDefaultReservations(viewportWidth?: number): UiReservations {
  const tier = viewportWidth === undefined ? 'regular' : pickSpacingTier(viewportWidth)
  const { gap, sideMargin } = SPACING_TIER[tier]
  return {
    headerHeight: DEFAULT_HEADER_HEIGHT,
    actionBarHeight: DEFAULT_ACTION_BAR_HEIGHT,
    cardGap: gap,
    cardSideMargin: sideMargin,
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
