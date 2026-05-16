import type { TarotCardInfo } from '../../src/core/api/types'

/**
 * Minimal single-card fixture shared by the overlay test harnesses
 * (use_overlay.test.ts + overlay_sizing.test.ts had a byte-identical
 * copy each). Imports the canonical type from core/api/types directly
 * rather than the deprecated tarot_reading re-export shim.
 */
export function makeCard(): TarotCardInfo {
  return {
    id: 'test_card',
    name: 'Test Card',
    nameEn: 'Test Card',
    number: 0,
    type: 'major',
    image: '/test.jpg',
    upright: {
      keywords: ['test'],
      meaning: 'Test upright meaning',
      sentiment: 'positive',
    },
    reversed: {
      keywords: ['test reversed'],
      meaning: 'Test reversed meaning',
      sentiment: 'negative',
    },
  }
}
