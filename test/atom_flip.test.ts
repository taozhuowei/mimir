/**
 * Tests for flipAtom — verifies that the atom writes rotationY tweens into
 * a real GSAP timeline and that staggers introduce per-card delay.
 */
import { describe, it, expect } from 'vitest'
import gsap from 'gsap'
import { flipAtom } from '../app/src/animation/atoms/flip'
import type { AtomContext } from '../app/src/animation/atoms/types'

function makeContext(cardCount = 1): {
  cardElements: { inners: { rotationY: number }[] }
  visible: Record<string, never>
} {
  const inners = Array.from({ length: cardCount }, () => ({ rotationY: 0 }))
  return {
    cardElements: { inners },
    visible: {},
  }
}

/**
 * Cast helper: the test fixture only populates `inners` — the slice of
 * PhaseContext that flipAtom reads. Narrow the production AtomContext
 * type via an explicit cast so we don't need to stub every unrelated
 * state field.
 */
function asAtomCtx(ctx: ReturnType<typeof makeContext>): AtomContext {
  return ctx as unknown as AtomContext
}

describe('flipAtom', () => {
  it('animates inners[i].rotationY to targetRotation', async () => {
    const ctx = makeContext(1)
    const tl = gsap.timeline()
    flipAtom(tl, asAtomCtx(ctx), {
      cardCount: 1, targetRotation: 180,
      duration: 0.4, stagger: 0,
    })
    await new Promise(r => setTimeout(r, 600))
    expect(ctx.cardElements.inners[0].rotationY).toBeCloseTo(180, 0)
  })

  it('staggers across multiple cards', async () => {
    const ctx = makeContext(3)
    const tl = gsap.timeline()
    flipAtom(tl, asAtomCtx(ctx), {
      cardCount: 3, targetRotation: 180,
      duration: 0.4, stagger: 0.2,
    })
    // After 100ms: card 0 should have advanced; card 2's delay (0.4s) hasn't
    // yet elapsed, so its rotationY should still trail card 0's.
    await new Promise(r => setTimeout(r, 100))
    const r0 = ctx.cardElements.inners[0].rotationY
    const r2 = ctx.cardElements.inners[2].rotationY
    expect(r0).toBeGreaterThan(0)
    expect(r2).toBeLessThan(r0)
  })
})
