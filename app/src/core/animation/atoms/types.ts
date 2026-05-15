/**
 * Name: animation/atoms/types
 * Purpose: shared types for animation atoms — pure functions that write
 *          tweens into a GSAP timeline.
 * Reason: atoms are reusable across phases (e.g., flipAtom called from the
 *          revealing phase, growAtom potentially reusable in restart flow).
 *          Each atom is a focused, testable unit.
 * Data flow: phase builder constructs a timeline and calls atoms in order;
 *          each atom writes its own tweens into the shared timeline.
 */
import type { PhaseContext } from '../../flow/types'
import type { gsap } from 'gsap'

/** Subset of PhaseContext that atoms typically need. */
export interface AtomContext {
  cardElements: PhaseContext['cardElements']
  visible: PhaseContext['visible']
}

/**
 * An atom is a pure function that writes its tweens into the given timeline
 * starting at `startAt` (a GSAP position parameter — number, label, or
 * relative offset like "+=0.1" / ">"). Atoms do NOT return the timeline —
 * the caller composes by calling multiple atoms in sequence.
 */
export type AtomFn<TConfig> = (
  timeline: gsap.core.Timeline,
  ctx: AtomContext,
  config: TConfig,
  startAt?: number | string,
) => void
