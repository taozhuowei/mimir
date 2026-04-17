/**
 * TEMPORARY test adapter for spread layout.
 * This file exists solely to keep spread_layout.test.ts green during the A.1 -> A.5 migration.
 * It will be removed in A.5 when tests are rewritten to use core layout resolvers directly.
 */

import type { SafeFrame } from '../core/viewport/types'
import { resolveCardSize } from '../core/sizing/card_size_solver'
import { resolveDrawLayout } from '../core/layout/draw_layout_resolver'
import { resolveResultLayout } from '../core/layout/result_layout_resolver'
import { resolveSpreadSpec, getSpreadSlots } from '../core/layout/spread_registry'
import { resolveSpreadSlots } from '../core/layout/spread_layout_calculator'
import { getBuiltInEnvelopeRequirement } from './overlay_layout/spread_spec'
import { getSpreadCardCount } from '../core/layout/spread_registry'

export { getSpreadCardCount }

export interface SpreadLayoutInput {
  spreadKind: string
  scene: 'draw_stage' | 'result_stage'
  containerWidth: number
  containerHeight: number
  isWide: boolean
  cardAspectRatio: number
  headerHeight?: number
}

export interface SpreadLayoutResult {
  cards: {
    slotId: string
    x: number
    y: number
    width: number
    height: number
    rotateDeg: number
    zIndex: number
  }[]
  cardWidth: number
  cardHeight: number
  stageShiftY: number
}

export function resolveSpreadLayout(input: SpreadLayoutInput): SpreadLayoutResult {
  const safeFrame: SafeFrame = {
    x: 0,
    y: 0,
    width: input.containerWidth,
    height: input.containerHeight,
    centerX: 0,
    centerY: 0,
    bottomInset: 0,
  }

  const cardSize = resolveCardSize({
    safeFrame,
    cardAspectRatio: input.cardAspectRatio,
    requirement: getBuiltInEnvelopeRequirement(input.spreadKind, input.isWide),
  })

  const spec = resolveSpreadSpec(input.spreadKind, input.isWide)
  const slotDefs = getSpreadSlots(input.spreadKind, input.isWide)
  const slots = resolveSpreadSlots(
    { ...spec, slots: slotDefs, wideSlots: input.isWide ? slotDefs : spec.wideSlots },
    input.isWide,
    cardSize,
  )

  const spread = input.scene === 'draw_stage'
    ? resolveDrawLayout(input.spreadKind, slots, safeFrame, cardSize, spec.zIndexes)
    : resolveResultLayout(input.spreadKind, slots, safeFrame, cardSize, input.headerHeight, spec.zIndexes)

  return {
    cards: spread.cards,
    cardWidth: cardSize.width,
    cardHeight: cardSize.height,
    stageShiftY: spread.stageShiftY,
  }
}
