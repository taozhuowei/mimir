/**
 * Name: spread_layout
 * Purpose: compose spread card sizing and positioning into a single pure layout solver.
 * Reason: preserve the existing public API while letting the envelope module own the
 *   "max bounds during the entire flow" calculation as a single source of truth.
 * Data flow: spread input flows in; sized + positioned cards (plus the envelope) flow out.
 */

import { resolveOverlayCardPositions } from './overlay_card_positions'
import {
  getSpreadEnvelopeRequirement,
  resolveOverlayCardEnvelope,
  type CardEnvelope,
} from './overlay_card_envelope'
import type {
  SpreadLayoutInput,
  SpreadLayoutResult,
  SpreadKind,
} from './overlay_layout_types'

export type {
  SpreadCardLayout,
  SpreadLayoutInput,
  SpreadLayoutResult,
  SpreadKind,
  SpreadScene,
} from './overlay_layout_types'

export interface SpreadLayoutResultWithEnvelope extends SpreadLayoutResult {
  envelope: CardEnvelope
}

/**
 * Get the number of cards for a spread kind.
 */
export function getSpreadCardCount(spreadKind: SpreadKind): number {
  switch (spreadKind) {
    case 'single_card':
      return 1
    case 'three_card':
      return 3
    case 'cross_spread':
      return 5
    default:
      return 3
  }
}

/**
 * Resolve spread layout for given input parameters.
 * Card sizing is derived from the spread envelope so that animations cannot overflow.
 */
export function resolveSpreadLayout(input: SpreadLayoutInput): SpreadLayoutResultWithEnvelope {
  const {
    spreadKind,
    scene,
    containerWidth,
    containerHeight,
    isWide,
    cardAspectRatio,
    headerHeight,
  } = input

  const envelope = resolveOverlayCardEnvelope({
    safeWidth: containerWidth,
    safeHeight: containerHeight,
    cardAspectRatio,
    ...getSpreadEnvelopeRequirement(spreadKind, isWide),
  })

  const positioned = resolveOverlayCardPositions({
    spreadKind,
    scene,
    containerWidth,
    containerHeight,
    isWide,
    envelope,
    headerHeight,
  })

  return { ...positioned, envelope }
}
