/**
 * Name: flows/reading/composables/reading_panel_timing
 * Purpose: staggered start-delay / char-interval timing for the reading
 *          result panel's per-field and per-keyword typewriter reveal.
 * Reason: these functions encode reading-panel field / keyword semantics,
 *         so they live with the reading flow rather than the generic
 *         typewriter engine (core/utils/typing/typewriter_model), which
 *         stays domain-free and no longer re-exports them.
 */

/**
 * Calculate staggered delays for result panel fields.
 */
export interface TypewriterFieldTiming {
  startDelay: number
  charInterval: number
}

export function calculateFieldTiming(
  cardIndex: number,
  fieldStep: number,
  baseDelay: number = 100,
  cardDelay: number = 200,
  stepDelay: number = 50,
): TypewriterFieldTiming {
  return {
    startDelay: baseDelay + cardIndex * cardDelay + fieldStep * stepDelay,
    charInterval: 18,
  }
}

export function calculateKeywordTiming(
  cardIndex: number,
  keywordIndex: number,
  baseDelay: number = 100,
  cardDelay: number = 200,
  keywordDelay: number = 40,
): TypewriterFieldTiming {
  const field4Delay = baseDelay + cardIndex * cardDelay + 3 * 50
  return {
    startDelay: field4Delay + 50 + keywordIndex * keywordDelay,
    charInterval: 16,
  }
}
