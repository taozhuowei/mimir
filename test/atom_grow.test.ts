/**
 * Tests for growAtom — verifies that the atom writes width/height tweens
 * into a real GSAP timeline that converge to the configured `to*` values.
 */
import { describe, it, expect } from 'vitest'
import gsap from 'gsap'
import { growAtom } from '../app/src/animation/atoms/grow'
import type { AtomContext } from '../app/src/animation/atoms/types'

function makeContext(cardCount = 1): {
  cardElements: { draws: { x: number; y: number; rotation: number; scale: number; opacity: number; zIndex: number; width: number; height: number }[] }
  visible: { draws: { value: boolean[] } }
} {
  // Plain mutable objects — the atom only mutates draws[i].width/height.
  const draws = Array.from({ length: cardCount }, () => ({
    x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 0, width: 100, height: 160,
  }))
  return {
    cardElements: { draws },
    visible: { draws: { value: [] } },
  }
}

/**
 * Cast helper: the test fixture only populates the slice of PhaseContext
 * that growAtom touches (`draws`). Production AtomContext expects the
 * full PhaseContext shape — for unit tests we narrow via a typed cast so
 * we don't need to fabricate every unrelated state object.
 */
function asAtomCtx(ctx: ReturnType<typeof makeContext>): AtomContext {
  return ctx as unknown as AtomContext
}

describe('growAtom', () => {
  it('animates draws[i].width and height from fromSize to toSize', async () => {
    const ctx = makeContext(1)
    const tl = gsap.timeline()
    growAtom(tl, asAtomCtx(ctx), {
      cardCount: 1, fromWidth: 100, fromHeight: 160,
      toWidth: 300, toHeight: 480,
      duration: 0.5, ease: 'none',
    })
    // Wait for animation to complete (duration 0.5s + a small buffer).
    await new Promise(r => setTimeout(r, 700))
    expect(ctx.cardElements.draws[0].width).toBeCloseTo(300, 0)
    expect(ctx.cardElements.draws[0].height).toBeCloseTo(480, 0)
  })

  it('initial set primes draws to fromSize before tween', async () => {
    const ctx = makeContext(1)
    ctx.cardElements.draws[0].width = 50  // out-of-band initial
    const tl = gsap.timeline()
    growAtom(tl, asAtomCtx(ctx), {
      cardCount: 1, fromWidth: 100, fromHeight: 160,
      toWidth: 300, toHeight: 480,
      duration: 0.5, ease: 'none',
    })
    // Allow timeline to start and the `set` to apply.
    await new Promise(r => setTimeout(r, 50))
    // The set should have brought width to ≥ 100, then tweening towards 300.
    expect(ctx.cardElements.draws[0].width).toBeGreaterThan(99)
  })
})
