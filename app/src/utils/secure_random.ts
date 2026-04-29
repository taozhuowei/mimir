/**
 * Browser-side secure random helpers.
 *
 * Why a dedicated module:
 *   The repository's quality scanner forbids the global insecure RNG
 *   outside tests (see scripts/quality_scan.js, scanMathRandom). The
 *   remaining frontend randomness is purely cosmetic — a few degrees of
 *   pre-flip rotation jitter on draw cards — but the rule applies
 *   blanket-style. Wrapping `crypto.getRandomValues` here keeps business
 *   code clean and the scanner happy without paying meaningful runtime
 *   cost.
 *
 * Platform support:
 *   `crypto.getRandomValues` is available in all H5 browsers we ship to
 *   and in WeChat Mini Program runtimes ≥ 2.18. The thin polyfill below
 *   gracefully degrades for ancient runtimes by reading from
 *   `Date.now()` — we accept lower entropy because the only consumer is
 *   visual jitter; nothing about fairness or security depends on it.
 */

interface CryptoLike {
  getRandomValues<T extends ArrayBufferView>(arr: T): T
}

function getCrypto(): CryptoLike | null {
  const g = globalThis as { crypto?: CryptoLike }
  return g.crypto && typeof g.crypto.getRandomValues === 'function' ? g.crypto : null
}

/** Uniform float in [0, 1). Source-agnostic, see file header. */
export function randomFloat(): number {
  const c = getCrypto()
  if (c) {
    const arr = new Uint32Array(1)
    c.getRandomValues(arr)
    return arr[0] / 0x1_0000_0000
  }
  // Last-resort fallback — quality is degraded but the call site only uses
  // it for visual jitter where any unpredictability is enough.
  return (Date.now() % 1_000_000) / 1_000_000
}

/** Uniform float in [min, max). */
export function randomInRange(min: number, max: number): number {
  return min + randomFloat() * (max - min)
}
