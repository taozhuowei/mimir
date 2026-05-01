/**
 * Name: animation/transitions/idle_to_divination
 * Purpose: timing constants for the idle-view → divination-view transition
 *          (PRD §8.1). CSS animations live in the view components; this file
 *          is the canonical numeric source they reference.
 * Reason: single source of truth prevents CSS durations and JS coordination
 *         from drifting apart.
 */

import { EASE_SPRING_CSS, DUR_IDLE_TO_DIV_MS } from '../easings'

/** Total duration of the element-swap phase (title out + progress in, ms). */
export const IDLE_TO_DIV_DURATION_MS = DUR_IDLE_TO_DIV_MS

/** CSS easing for all idle → divination transition elements. */
export const IDLE_TO_DIV_EASE = EASE_SPRING_CSS

/** Vertical distance the title area translates upward on exit (px). */
export const TITLE_EXIT_TRANSLATE_PX = 24

/** Vertical distance the progress area slides from above on entrance (px). */
export const PROGRESS_ENTER_TRANSLATE_PX = 20
