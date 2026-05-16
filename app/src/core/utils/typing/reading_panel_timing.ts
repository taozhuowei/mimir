/**
 * Name: reading_panel_timing
 * Purpose: staggered start-delay / char-interval timing for the reading
 *          result panel's per-field and per-keyword typewriter reveal.
 * Reason: split out of typewriter_model.ts so the generic typewriter engine
 *         stays domain-free. These functions encode reading-panel field /
 *         keyword semantics, so they belong to the reading flow.
 * Flow ownership: semantically a reading-flow concern. The flows migration
 *         batch will relocate this into the reading flow; it is kept in core
 *         for now (this batch is a core-internal single-responsibility split
 *         only, no cross-flow moves).
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
