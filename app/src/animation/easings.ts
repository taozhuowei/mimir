/**
 * Name: animation/easings
 * Purpose: canonical easing curves and duration constants for all view and
 *          phase transitions, as specified in PRD §7.5 and §8.
 * Reason: single source of truth so CSS transition durations and any future
 *         JS coordination stay consistent.
 */

// ── CSS cubic-bezier strings ─────────────────────────────────────────────────

/** Primary spring easing — expo.out equivalent. All main view transitions
 *  and element entrances use this (PRD §8.1.2, §8.2.1, §8.2.2). */
export const EASE_SPRING_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** Secondary sharp easing. Used for confirmatory or exit motions. */
export const EASE_SHARP_CSS = 'cubic-bezier(0.32, 0.72, 0, 1)'

// ── GSAP easing strings ──────────────────────────────────────────────────────

/** GSAP equivalent of EASE_SPRING_CSS. */
export const EASE_SPRING_GSAP = 'expo.out'

/** Standard ease-out for secondary GSAP tweens. */
export const EASE_OUT_GSAP = 'power2.out'

/** Standard ease-in for exit tweens. */
export const EASE_IN_GSAP = 'power2.in'

// ── Transition durations (ms, CSS convention) ────────────────────────────────

/** Duration for the idle → divination element swap (PRD §8.1.2). */
export const DUR_IDLE_TO_DIV_MS = 450

/** Duration for the reading split-view slide-in on wide screens (PRD §8.2.1). */
export const DUR_DIV_TO_READING_WIDE_MS = 450

/** Duration for the reading drawer slide-up on narrow screens (PRD §8.2.2). */
export const DUR_DIV_TO_READING_NARROW_MS = 350

/** Pause between flip-animation completion and reading view entrance (PRD §8.2). */
export const DUR_PRE_READING_PAUSE_MS = 300
