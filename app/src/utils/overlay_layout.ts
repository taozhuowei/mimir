/**
 * Name: overlay_layout
 * Purpose: bridge viewport-safe overlay frames with spread and animation layout rules.
 * Reason: keep viewport framing, cut offsets, and reveal emphasis independent from GSAP sequencing,
 *   while sharing the single card envelope across sizing and animation modules.
 * Data flow: viewport metrics and spread metadata flow in; card layouts and motion plans flow out.
 */

import { resolveSpreadLayout } from './spread_layout'
import {
  getSpreadEnvelopeRequirement,
  resolveOverlayCardEnvelope,
  type CardEnvelope,
} from './overlay_card_envelope'
import type {
  SpreadKind,
  SpreadLayoutResult,
  SpreadScene,
} from './overlay_layout_types'
import type { OverlayViewportMetrics } from './overlay_viewport'

export interface OverlaySceneLayout extends SpreadLayoutResult {
  safeTopInset: number
  safeBottomInset: number
  safeSideInset: number
  envelope: CardEnvelope
}

export interface OverlayCutLayoutResult {
  leadingOffsetX: number
  leadingOffsetY: number
  trailingOffsetX: number
  trailingOffsetY: number
}

export interface OverlayRevealMotionPlan {
  focusScale: number
  dockScale: number
}

/**
 * Resolve a spread layout inside the overlay safe frame, then map it back into stage coordinates.
 */
export function resolveOverlaySceneLayout(input: {
  spreadKind: SpreadKind
  scene: SpreadScene
  viewport: OverlayViewportMetrics
  isWide: boolean
  cardAspectRatio: number
}): OverlaySceneLayout {
  const { spreadKind, scene, viewport, isWide, cardAspectRatio } = input
  const safeFrame = resolveOverlaySafeFrame({ scene, viewport })

  const baseLayout = resolveSpreadLayout({
    spreadKind,
    scene,
    containerWidth: safeFrame.width,
    containerHeight: safeFrame.height,
    isWide,
    cardAspectRatio,
    headerHeight: 0,
  })

  return {
    ...baseLayout,
    cards: baseLayout.cards.map(card => ({
      ...card,
      y: card.y + safeFrame.centerYOffset,
    })),
    safeTopInset: safeFrame.topInset,
    safeBottomInset: safeFrame.bottomInset,
    safeSideInset: safeFrame.sideInset,
  }
}

/**
 * Resolve cut offsets that stay inside the safe frame, anchored on the shared envelope.
 * On wide screens the three cut cards spread horizontally (3 slots); on narrow screens
 * they stack vertically (3 slots). Either way, no cut frame can exceed the envelope.
 */
export function resolveOverlayCutLayout(input: {
  viewport: OverlayViewportMetrics
  isWide: boolean
  cardAspectRatio: number
  spreadKind: SpreadKind
}): OverlayCutLayoutResult {
  const { viewport, isWide, cardAspectRatio, spreadKind } = input
  const safeFrame = resolveOverlaySafeFrame({ scene: 'draw_stage', viewport })

  const envelope = resolveOverlayCardEnvelope({
    safeWidth: safeFrame.width,
    safeHeight: safeFrame.height,
    cardAspectRatio,
    ...getSpreadEnvelopeRequirement(spreadKind, isWide),
  })

  if (isWide) {
    // Three cut cards spread horizontally — neighbours sit one slotPitch apart.
    return {
      leadingOffsetX: -envelope.slotPitchX,
      leadingOffsetY: 0,
      trailingOffsetX: envelope.slotPitchX,
      trailingOffsetY: 0,
    }
  }

  return {
    leadingOffsetX: 0,
    leadingOffsetY: -envelope.slotPitchY,
    trailingOffsetX: 0,
    trailingOffsetY: envelope.slotPitchY,
  }
}

/**
 * Resolve the flip emphasis scale before cards are collected into the result layout.
 */
export function resolveOverlayRevealMotion(input: {
  drawCardWidth: number
  resultCardWidth: number
}): OverlayRevealMotionPlan {
  const { drawCardWidth, resultCardWidth } = input
  const preferredReadableWidth = clamp(
    Math.max(drawCardWidth * 1.12, resultCardWidth * 1.12),
    144,
    188,
  )

  return {
    focusScale: clamp(preferredReadableWidth / Math.max(drawCardWidth, 1), 1.08, 1.18),
    dockScale: 1,
  }
}

function resolveOverlaySafeFrame(input: {
  scene: SpreadScene
  viewport: OverlayViewportMetrics
}): {
  width: number
  height: number
  centerYOffset: number
  topInset: number
  bottomInset: number
  sideInset: number
} {
  const { scene, viewport } = input
  const sideInset = scene === 'result_stage' ? 20 : 24
  const topInset = Math.max(0, viewport.headerBottom - viewport.topBarHeight) + (scene === 'result_stage' ? 8 : 12)
  const bottomInset = Math.min(
    viewport.footerReserve,
    Math.max(scene === 'result_stage' ? 44 : 56, viewport.stageHeight * (scene === 'result_stage' ? 0.16 : 0.2)),
  )

  return {
    width: Math.max(0, viewport.stageWidth - sideInset * 2),
    height: Math.max(0, viewport.stageHeight - topInset - bottomInset),
    centerYOffset: (topInset - bottomInset) / 2,
    topInset,
    bottomInset,
    sideInset,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
