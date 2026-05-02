/**
 * Name: core/sizing/scale
 * Purpose: derive a single proportional scale factor `k` from the viewport
 *          width and expose pixel-valued sizes (header height,
 *          margins, font sizes, etc.) as `baseline × k`. Provides a Vue
 *          composable that keeps those sizes reactive with respect to the
 *          viewport, with rAF coalescing and a sub-pixel jitter
 *          short-circuit so micro-changes do not trigger reactivity. The
 *          three exported pure functions (`pickCanvasWidth`, `deriveScale`,
 *          `deriveSizes`) are the only pieces tests target; the composable
 *          is the lone piece that touches uni APIs and browser globals.
 * Reason: the previous approach hard-coded pixel values per breakpoint and
 *         scattered tier picks across components, making it impossible to
 *         tune the design proportionally to the device. A single `k` driven
 *         by canvas width gives every UI surface one consistent rule:
 *         sizes grow / shrink together, and iPhone 8 stays the baseline so
 *         no existing layout regresses on the smallest supported device.
 * Data flow: uni.getWindowInfo() / uni.onWindowResize ──▶
 *            pickCanvasWidth(viewportWidth) ──▶ deriveScale(canvasWidth) ──▶
 *            deriveSizes(canvasWidth) ──▶ Readonly<Ref<ResponsiveSizes>>
 *            consumed by UI surfaces.
 */

import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue'
import type { Ref } from 'vue'

// ---------------------------------------------------------------------------
// rAF / cAF shims — UniApp targets H5 + mini-programs. The H5 runtime exposes
// `requestAnimationFrame` / `cancelAnimationFrame` as globals, but mini-program
// runtimes (WeChat, Alipay, etc.) do not — calling the bare globals there
// throws ReferenceError. Feature-detect once at module load and fall back to
// `setTimeout` (~16 ms ≈ 60 fps) so the composable works on every target.
// ---------------------------------------------------------------------------

// `setTimeout` returns `number` in browsers and `NodeJS.Timeout` (an object)
// in Node — the union is opaque to TypeScript, so we narrow via `Number()`
// once at the boundary. The rAF fallback path tracks the raw timer id so the
// disposal hook (`cancelAnimationFrame` shim) clears it correctly even on
// runtimes where `setTimeout` returns an object.
//
// The H5 globals are wrapped in `typeof === 'function'` feature detection so
// mini-program runtimes (which raise ReferenceError on bare access) hit the
// `setTimeout` fallback instead. The lint rule that bans these globals is
// disabled per-line because the guarded access is the whole point of the
// shim — without it the fallback branch becomes unreachable.
const raf: (cb: FrameRequestCallback) => number =
  // eslint-disable-next-line no-restricted-globals -- reason: H5-only DOM API behind feature-detect for the mini-program fallback path.
  typeof requestAnimationFrame === 'function'
    // eslint-disable-next-line no-restricted-globals -- reason: H5-only DOM API behind feature-detect for the mini-program fallback path.
    ? requestAnimationFrame
    : (cb) => {
        const handle = setTimeout(
          () => cb(typeof performance !== 'undefined' ? performance.now() : Date.now()),
          16,
        )
        // Coerce both number-and-object timer ids into the numeric handle the
        // composable stores. `Number(NodeJS.Timeout)` returns `NaN`, which the
        // shim's cancel branch treats as "nothing to clear" — safe because the
        // timer always fires before disposal in single-threaded JS.
        return Number(handle)
      }

const caf: (handle: number) => void =
  // eslint-disable-next-line no-restricted-globals -- reason: H5-only DOM API behind feature-detect for the mini-program fallback path.
  typeof cancelAnimationFrame === 'function'
    // eslint-disable-next-line no-restricted-globals -- reason: H5-only DOM API behind feature-detect for the mini-program fallback path.
    ? cancelAnimationFrame
    : (handle) => {
        if (Number.isFinite(handle)) clearTimeout(handle)
      }

// ---------------------------------------------------------------------------
// Constants — iPhone 8 baseline (375 px) pixel values.
//
// All baselines are expressed for a 375 px logical canvas. When the device
// has a wider viewport (up to iPhone 17 Pro Max at 440 px), the sizes grow
// proportionally via `k = canvasWidth / 375`. Below 375 the canvas is
// pinned at 375 — the layout will overflow; we do not try to fit smaller
// devices because they fall below the supported envelope: a non-blocking
// "screen too small" banner is shown, but the layout still tries to render.
// ---------------------------------------------------------------------------

/** Smallest logical canvas width the scale system uses (iPhone 8). */
export const MIN_CANVAS_WIDTH = 375
/** Largest logical canvas width the scale system uses (iPhone 17 Pro Max). */
export const MAX_CANVAS_WIDTH = 440

/** Header total height at the iPhone 8 baseline (px). */
export const BASELINE_HEADER_HEIGHT = 80
/** Page side / outer margin at the baseline (px). */
export const BASELINE_MARGIN = 16
/** Inter-card gap at the baseline (px). */
export const BASELINE_GAP = 12
/** Minimum drawer initial height at the baseline (px). */
export const BASELINE_DRAWER_MIN_HEIGHT = 120
/** Bottom action area height at the baseline (px). */
export const BASELINE_ACTION_AREA_HEIGHT = 96
/** Large display font size at the baseline (px). */
export const BASELINE_FONT_L = 22
/** Medium body font size at the baseline (px). */
export const BASELINE_FONT_M = 16
/** Small body font size at the baseline (px). */
export const BASELINE_FONT_S = 14
/** Extra-small caption font size at the baseline (px). */
export const BASELINE_FONT_XS = 12

/** Card visual aspect ratio (height / width) — tarot cards are tall. */
export const CARD_ASPECT_RATIO = 1.6

/**
 * Sub-pixel jitter threshold. If a recomputed `k` differs from the previous
 * by less than this fraction, the sizes are not updated. 0.5% lines up
 * with "less than half a pixel" on every size derived from k * baseline,
 * ensuring rounded outputs are stable while reactivity stays cheap.
 */
const SCALE_JITTER_THRESHOLD = 0.005

// ---------------------------------------------------------------------------
// Pure functions — no Vue, no uni, no DOM. Trivially testable.
// ---------------------------------------------------------------------------

/**
 * Pick the logical canvas width for a real viewport width.
 *
 *   width <  375 → 375  (layout will overflow; we don't fit smaller devices)
 *   375 ≤ w ≤ 440 → rounded to integer (fractional viewports are coerced)
 *   width >  440 → 440  (any extra horizontal space becomes background)
 *
 * Non-finite inputs (NaN, -Infinity) collapse to MIN_CANVAS_WIDTH; +Infinity
 * collapses to MAX_CANVAS_WIDTH. The result is always an integer in
 * `[MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH]`, so downstream `deriveSizes`
 * receives a stable, integer canvas width regardless of caller.
 *
 * Pure function: same input always produces the same output.
 */
export function pickCanvasWidth(viewportWidth: number): number {
  // Order matters: clamp *up* (NaN, -Infinity, < MIN) before clamping *down*.
  // NaN compared with any operator is false, so the NaN branch must be the
  // explicit `Number.isNaN` check below — it cannot rely on `< MIN_CANVAS_WIDTH`.
  if (Number.isNaN(viewportWidth) || viewportWidth < MIN_CANVAS_WIDTH) {
    return MIN_CANVAS_WIDTH
  }
  if (viewportWidth > MAX_CANVAS_WIDTH) {
    return MAX_CANVAS_WIDTH
  }
  return Math.round(viewportWidth)
}

/**
 * Derive the global scale factor `k = canvasWidth / 375`.
 *
 * For canvas widths in the supported range the result is in
 * [1.0, 440 / 375 ≈ 1.1733]. Callers should pass canvas widths that
 * have already been clamped via `pickCanvasWidth`, but the function does
 * not enforce that — it is a pure ratio.
 */
export function deriveScale(canvasWidth: number): number {
  return canvasWidth / MIN_CANVAS_WIDTH
}

// ---------------------------------------------------------------------------
// Sizes interface — the single source of truth for derived px values.
// ---------------------------------------------------------------------------

/**
 * Pixel-valued sizes, all derived from `canvasWidth` via `k`.
 * Every px field is rounded to the nearest integer so consumers never
 * see sub-pixel values that would force fractional layouts.
 */
export interface ResponsiveSizes {
  /** Logical canvas width (clamped to [375, 440]). */
  canvasWidth: number
  /** Scale factor relative to iPhone 8 baseline. */
  k: number
  /** Header height in px (baseline 80 × k, rounded). */
  headerHeight: number
  /** Outer / page margin in px (baseline 16 × k, rounded). */
  margin: number
  /** Inter-card gap in px (baseline 12 × k, rounded). */
  gap: number
  /** Minimum drawer initial height in px (baseline 120 × k, rounded). */
  drawerMinHeight: number
  /** Bottom action area height in px (baseline 96 × k, rounded). */
  actionAreaHeight: number
  /** Large display font size in px (baseline 22 × k, rounded). */
  fontL: number
  /** Medium body font size in px (baseline 16 × k, rounded). */
  fontM: number
  /** Small body font size in px (baseline 14 × k, rounded). */
  fontS: number
  /** Extra-small caption font size in px (baseline 12 × k, rounded). */
  fontXS: number
}

/**
 * Pure derivation: given a canvas width, return all derived px sizes.
 * Each px field is rounded to the nearest integer.
 *
 * Pure function: same input always produces the same output.
 */
export function deriveSizes(canvasWidth: number): ResponsiveSizes {
  const k = deriveScale(canvasWidth)
  return {
    canvasWidth,
    k,
    headerHeight: Math.round(BASELINE_HEADER_HEIGHT * k),
    margin: Math.round(BASELINE_MARGIN * k),
    gap: Math.round(BASELINE_GAP * k),
    drawerMinHeight: Math.round(BASELINE_DRAWER_MIN_HEIGHT * k),
    actionAreaHeight: Math.round(BASELINE_ACTION_AREA_HEIGHT * k),
    fontL: Math.round(BASELINE_FONT_L * k),
    fontM: Math.round(BASELINE_FONT_M * k),
    fontS: Math.round(BASELINE_FONT_S * k),
    fontXS: Math.round(BASELINE_FONT_XS * k),
  }
}

// ---------------------------------------------------------------------------
// Viewport adapter — pure conversion from platform window info to a
// PhysicalViewport. The layout solver consumes this shape directly, so the
// adapter lives alongside the sizes it ultimately drives. Width is left
// unclamped so callers can either feed the raw viewport into `pickScreenMode`-
// style branches or pipe it through `pickCanvasWidth` to get the canvas
// value the solver actually uses.
// ---------------------------------------------------------------------------

/**
 * Physical viewport metrics in CSS pixels. The `width` field is the caller's
 * responsibility — typically the result of `pickCanvasWidth(realWidth)` when
 * fed into the layout solver, or the raw viewport width when used for
 * screen-mode classification.
 */
export interface PhysicalViewport {
  /** Logical canvas width (caller's responsibility — typically pickCanvasWidth(real)). */
  width: number
  /** Real viewport height in px. Not clamped. */
  height: number
  /** Top safe-area inset (status bar / notch) in px. */
  safeAreaTop: number
  /** Bottom safe-area inset in px. */
  safeAreaBottom: number
}

/**
 * Shape of the platform-supplied window info we accept. Kept structurally
 * typed so callers can pass `uni.getWindowInfo()` results directly without
 * an explicit conversion.
 */
export interface WindowInfoShape {
  windowWidth: number
  windowHeight: number
  safeAreaInsets?: { top?: number; bottom?: number; left?: number; right?: number }
}

/**
 * Adapter: convert platform window info into a PhysicalViewport.
 *
 * Pure / no side effects. Does NOT clamp the width — pipe through
 * `pickCanvasWidth` at the call site if you want the canvas value the
 * layout solver should use. Negative or fractional inputs are coerced to
 * non-negative integers so downstream math sees stable values.
 */
export function readViewport(info: WindowInfoShape): PhysicalViewport {
  // Single source of zero-defaults: if `safeAreaInsets` is missing entirely
  // (older runtimes / mini-program edge cases) substitute a fully-populated
  // object so each field read below sees a real number, no per-field `?? 0`.
  const insets = info.safeAreaInsets ?? { top: 0, bottom: 0 }
  return {
    width: Math.max(0, Math.floor(info.windowWidth)),
    height: Math.max(0, Math.floor(info.windowHeight)),
    safeAreaTop: Math.max(0, Math.floor(insets.top ?? 0)),
    safeAreaBottom: Math.max(0, Math.floor(insets.bottom ?? 0)),
  }
}

// ---------------------------------------------------------------------------
// Composable — reactive viewport + sizes with rAF coalescing.
// ---------------------------------------------------------------------------

/**
 * Reactive viewport metrics surfaced alongside the sizes. Identical shape
 * to `PhysicalViewport` — kept as a type alias so the composable's state
 * uses one source of truth with the pure adapter `readViewport`.
 */
export type ResponsiveViewport = PhysicalViewport

/** Return shape of `useResponsiveScale`. */
export interface ResponsiveScaleState {
  /** Reactive sizes; updated when viewport width changes (rAF coalesced). */
  sizes: Readonly<Ref<ResponsiveSizes>>
  /** Reactive viewport metrics (width, height, safe areas). */
  viewport: Readonly<Ref<ResponsiveViewport>>
  /**
   * Tear-down hook: removes the `uni.onWindowResize` listener and cancels any
   * pending rAF. Idempotent — safe to call multiple times. Inside a Vue scope
   * (component setup or `effectScope`) this runs automatically via
   * `onScopeDispose`; outside any scope (e.g. ad-hoc unit-test harness)
   * callers must invoke it manually to avoid leaking the listener.
   */
  dispose: () => void
}

/**
 * Read the current viewport from uni APIs and adapt to `ResponsiveViewport`.
 * Side-effecting wrapper around the pure `readViewport(info)` adapter — the
 * composable's only point of contact with the platform.
 */
function readViewportFromUni(): ResponsiveViewport {
  return readViewport(uni.getWindowInfo())
}

/**
 * Decide whether two scale factors differ enough to warrant a token update.
 * Returns `true` when the relative change `|next - prev| / prev` exceeds
 * the jitter threshold. Garbage `next` values (NaN, ±Infinity) are ignored
 * so a malformed window event cannot poison the reactive state. An invalid
 * or non-positive `prev` (uninitialised, NaN) is treated as "no previous
 * value" and forces an update.
 */
function scaleChangedSignificantly(prev: number, next: number): boolean {
  if (!Number.isFinite(next)) return false // ignore garbage updates
  if (!Number.isFinite(prev) || prev <= 0) return true
  return Math.abs(next - prev) / prev >= SCALE_JITTER_THRESHOLD
}

/**
 * Vue composable: exposes reactive `sizes` + `viewport`, recomputes on
 * `uni.onWindowResize`, coalesces resize bursts to the next animation
 * frame, and short-circuits sub-pixel jitter so reactivity stays cheap.
 *
 * Cleanup: the returned object exposes a `dispose()` method that removes
 * the resize listener and cancels any pending rAF. When called inside a
 * Vue scope (`setup()` or `effectScope()`) `dispose()` is also wired into
 * `onScopeDispose`, so callers do nothing. When called outside any scope
 * (e.g. an ad-hoc unit-test harness) the caller must invoke `dispose()`
 * manually to release the listener — the no-op `onScopeDispose` branch
 * deliberately skips registration to avoid Vue's "called outside scope"
 * warning.
 */
export function useResponsiveScale(): ResponsiveScaleState {
  const initialViewport = readViewportFromUni()
  const initialCanvas = pickCanvasWidth(initialViewport.width)

  const viewport = ref<ResponsiveViewport>(initialViewport)
  const sizes = ref<ResponsiveSizes>(deriveSizes(initialCanvas))

  // 0 sentinel = no pending frame. Number both because `raf` returns `number`
  // on H5 and because `setTimeout` returns `number` in the shim path.
  let pendingFrame = 0
  let disposed = false

  /** Recompute viewport + sizes; called inside the rAF callback. */
  const recompute = (): void => {
    pendingFrame = 0
    if (disposed) return
    const nextViewport = readViewportFromUni()
    viewport.value = nextViewport

    const nextCanvas = pickCanvasWidth(nextViewport.width)
    const nextK = deriveScale(nextCanvas)
    if (!scaleChangedSignificantly(sizes.value.k, nextK)) return

    sizes.value = deriveSizes(nextCanvas)
  }

  /**
   * Resize listener: coalesces bursts to the next animation frame, so
   * multiple rapid resize events produce a single token update. Aligning
   * with the next frame also lands the update in the gap between GSAP
   * ticks, avoiding reactivity work mid-animation.
   */
  const resizeHandler = (): void => {
    if (disposed || pendingFrame !== 0) return
    pendingFrame = raf(recompute)
  }

  uni.onWindowResize(resizeHandler)

  /**
   * Idempotent tear-down. First call removes the listener and cancels any
   * pending frame; subsequent calls short-circuit on the `disposed` flag.
   */
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    uni.offWindowResize(resizeHandler)
    if (pendingFrame !== 0) {
      caf(pendingFrame)
      pendingFrame = 0
    }
  }

  // Auto-cleanup hook is registered only when we have an active Vue scope.
  // `getCurrentScope()` is non-null inside `setup()` and `effectScope()`
  // and undefined for ad-hoc calls; guarding here avoids the runtime
  // warning Vue emits when `onScopeDispose` is invoked outside a scope.
  // Outside a scope the caller must invoke the returned `dispose()` method.
  if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose)
  }

  return {
    sizes: readonly(sizes) as Readonly<Ref<ResponsiveSizes>>,
    viewport: readonly(viewport) as Readonly<Ref<ResponsiveViewport>>,
    dispose,
  }
}
