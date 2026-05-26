/**
 * Server-side secure random helpers.
 *
 * Why a dedicated module:
 *   The repository's quality scanner forbids the global insecure RNG
 *   outside tests (see config/scripts/quality_scan.js, scanMathRandom). The
 *   shuffle and orientation steps inside the divination service need a
 *   real random source, so we wrap node:crypto here. Keeping the wrapper
 *   tiny means business code reads as `randomBelow(n)` / `randomBool()`
 *   and never has to import node:crypto directly.
 *
 * Random quality:
 *   `crypto.randomInt` uses the platform CSPRNG. For a tarot draw this is
 *   overkill but cheap, and it removes any predictability concern from
 *   v8's userland PRNG state.
 */

import { randomInt } from 'node:crypto'

/** Inclusive lower bound 0, exclusive upper bound `maxExclusive`. */
export function randomBelow(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`randomBelow requires a positive integer, got ${maxExclusive}`)
  }
  return randomInt(0, maxExclusive)
}

/** Uniform 50/50 boolean. */
export function randomBool(): boolean {
  return randomInt(0, 2) === 0
}
