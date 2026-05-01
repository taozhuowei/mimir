/**
 * Name: animation/transitions/divination_to_reading
 * Purpose: timing constants for the divination-view → reading-view transition
 *          (PRD §8.2). CSS transitions live in the view components; this file
 *          is the canonical numeric source.
 * Reason: single source of truth prevents CSS durations from drifting.
 */

import {
  EASE_SPRING_CSS,
  DUR_DIV_TO_READING_WIDE_MS,
  DUR_DIV_TO_READING_NARROW_MS,
  DUR_PRE_READING_PAUSE_MS,
} from '../easings'

/** Duration for the wide-screen split-view slide-in (ms, PRD §8.2.1). */
export const DIV_TO_READING_WIDE_MS = DUR_DIV_TO_READING_WIDE_MS

/** Duration for the narrow-screen drawer slide-up (ms, PRD §8.2.2). */
export const DIV_TO_READING_NARROW_MS = DUR_DIV_TO_READING_NARROW_MS

/** Pause after flip animation completes, before reading view enters (PRD §8.2). */
export const PRE_READING_PAUSE_MS = DUR_PRE_READING_PAUSE_MS

/** CSS easing for all divination → reading transition elements. */
export const DIV_TO_READING_EASE = EASE_SPRING_CSS
