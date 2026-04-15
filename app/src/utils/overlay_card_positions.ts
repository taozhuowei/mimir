/**
 * Name: overlay_card_positions
 * Purpose: calculate spread slot positions based on the shared card envelope.
 * Reason: keep scene-specific positioning rules isolated, but anchor every gap on the
 *   single envelope source so layouts and animations cannot disagree.
 * Data flow: envelope and scene bounds flow in; positioned spread slots flow to the overlay.
 */

import type { CardEnvelope } from './overlay_card_envelope'
import type {
  SpreadCardLayout,
  SpreadKind,
  SpreadLayoutResult,
  SpreadScene,
} from './overlay_layout_types'

export interface OverlayCardPositionInput {
  spreadKind: SpreadKind
  scene: SpreadScene
  containerWidth: number
  containerHeight: number
  isWide: boolean
  envelope: CardEnvelope
  headerHeight?: number
}

/**
 * Build card positions for a spread using the shared envelope.
 */
export function resolveOverlayCardPositions(input: OverlayCardPositionInput): SpreadLayoutResult {
  const {
    spreadKind,
    scene,
    containerWidth,
    containerHeight,
    isWide,
    envelope,
    headerHeight,
  } = input

  switch (spreadKind) {
    case 'single_card':
      return buildSingleCardLayout(envelope, containerHeight, scene, headerHeight)
    case 'three_card':
      return buildThreeCardLayout(envelope, containerWidth, containerHeight, isWide, scene, headerHeight)
    case 'cross_spread':
      return buildCrossSpreadLayout(envelope, containerHeight, isWide, scene, headerHeight)
    default:
      return buildThreeCardLayout(envelope, containerWidth, containerHeight, isWide, scene, headerHeight)
  }
}

function buildSingleCardLayout(
  envelope: CardEnvelope,
  containerHeight: number,
  scene: SpreadScene,
  headerHeight: number = 0,
): SpreadLayoutResult {
  const { cardWidth, cardHeight } = envelope
  const centerX = 0

  if (scene === 'draw_stage') {
    const liftY = Math.min(containerHeight * 0.12, cardHeight * 0.3)
    const stageShiftY = liftY
    const minCenterY = -containerHeight / 2 + cardHeight / 2
    const maxCenterY = containerHeight / 2 - cardHeight / 2
    const centerY = clamp(liftY, minCenterY, maxCenterY)

    return {
      cardWidth,
      cardHeight,
      stageShiftY,
      cards: [{
        slotId: 'center',
        x: centerX,
        y: centerY,
        width: cardWidth,
        height: cardHeight,
        rotateDeg: 0,
        zIndex: 20,
      }],
    }
  }

  return {
    cardWidth,
    cardHeight,
    stageShiftY: 0,
    cards: [{
      slotId: 'center',
      x: centerX,
      y: headerHeight / 2,
      width: cardWidth,
      height: cardHeight,
      rotateDeg: 0,
      zIndex: 20,
    }],
  }
}

function buildThreeCardLayout(
  envelope: CardEnvelope,
  containerWidth: number,
  containerHeight: number,
  isWide: boolean,
  scene: SpreadScene,
  headerHeight: number = 0,
): SpreadLayoutResult {
  const { cardWidth, cardHeight, slotPitchX, slotPitchY } = envelope
  const horizontalMargin = Math.max(cardWidth * 0.08, 12)
  const verticalMargin = Math.max(cardHeight * 0.06, 12)
  const maxCenterX = Math.max(0, containerWidth / 2 - cardWidth / 2 - horizontalMargin)
  const minCenterY = -containerHeight / 2 + cardHeight / 2 + verticalMargin
  const maxCenterY = containerHeight / 2 - cardHeight / 2 - verticalMargin

  if (isWide) {
    // Row layout uses slotPitchX (cardWidth + gap) so 3 cards exactly fill envelope width.
    const sideOffset = Math.min(slotPitchX, maxCenterX)
    const liftY = Math.min(containerHeight * 0.32, cardHeight * 1.26)
    const targetRowY = scene === 'draw_stage' ? liftY : 0
    const centeredRowY = clamp(targetRowY, minCenterY, maxCenterY)

    return buildSpreadResult(cardWidth, cardHeight, scene === 'draw_stage' ? liftY : 0, [
      { slotId: 'past', x: -sideOffset, y: centeredRowY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 20 },
      { slotId: 'present', x: 0, y: centeredRowY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 21 },
      { slotId: 'future', x: sideOffset, y: centeredRowY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 22 },
    ])
  }

  // Column layout uses slotPitchY so 3 cards stay within envelope height with gaps.
  const verticalAvailable = Math.max(0, (containerHeight / 2 - cardHeight / 2) - verticalMargin)
  const verticalSpread = Math.min(slotPitchY, verticalAvailable)

  if (scene === 'draw_stage') {
    const liftY = Math.min(containerHeight * 0.16, cardHeight * 0.56)
    const targetCenterY = Math.max(liftY, liftY + headerHeight / 2 + 60 - containerHeight * 0.29)
    const mobileCenterY = clamp(targetCenterY, minCenterY + verticalSpread, maxCenterY - verticalSpread)

    return buildSpreadResult(cardWidth, cardHeight, liftY, [
      { slotId: 'past', x: 0, y: mobileCenterY + verticalSpread, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 20 },
      { slotId: 'present', x: 0, y: mobileCenterY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 21 },
      { slotId: 'future', x: 0, y: mobileCenterY - verticalSpread, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 22 },
    ])
  }

  const targetCenterY = headerHeight / 2
  const mobileCenterY = clamp(targetCenterY, minCenterY + verticalSpread, maxCenterY - verticalSpread)

  return buildSpreadResult(cardWidth, cardHeight, 0, [
    { slotId: 'past', x: 0, y: mobileCenterY + verticalSpread, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 20 },
    { slotId: 'present', x: 0, y: mobileCenterY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 21 },
    { slotId: 'future', x: 0, y: mobileCenterY - verticalSpread, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 22 },
  ])
}

function buildCrossSpreadLayout(
  envelope: CardEnvelope,
  containerHeight: number,
  isWide: boolean,
  scene: SpreadScene,
  headerHeight: number = 0,
): SpreadLayoutResult {
  const { cardWidth, cardHeight, slotPitchX, slotPitchY } = envelope
  const liftY = isWide
    ? Math.min(containerHeight * 0.28, cardHeight)
    : Math.min(containerHeight * 0.12, cardHeight * 0.4)
  const horizontalOffset = slotPitchX
  const verticalOffset = slotPitchY
  const centerX = 0

  if (scene === 'draw_stage') {
    let centerY: number
    if (!isWide) {
      const targetCenterY = liftY + headerHeight / 2 + 60 - containerHeight * 0.29
      centerY = clamp(targetCenterY, -containerHeight * 0.1, containerHeight * 0.1)
      const minNorthY = -containerHeight / 2 + cardHeight / 2 + headerHeight + 8
      const northY = centerY - verticalOffset
      if (northY < minNorthY) {
        centerY = minNorthY + verticalOffset
      }
    } else {
      centerY = clamp(liftY * 0.5, -containerHeight * 0.1, containerHeight * 0.1)
    }

    return buildSpreadResult(cardWidth, cardHeight, liftY, [
      { slotId: 'center', x: centerX, y: centerY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 25 },
      { slotId: 'north', x: centerX, y: centerY - verticalOffset, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
      { slotId: 'south', x: centerX, y: centerY + verticalOffset, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
      { slotId: 'west', x: centerX - horizontalOffset, y: centerY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
      { slotId: 'east', x: centerX + horizontalOffset, y: centerY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
    ])
  }

  const centerY = clamp(headerHeight / 2, -containerHeight * 0.1, containerHeight * 0.1)

  return buildSpreadResult(cardWidth, cardHeight, 0, [
    { slotId: 'center', x: centerX, y: centerY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 25 },
    { slotId: 'north', x: centerX, y: centerY - verticalOffset, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
    { slotId: 'south', x: centerX, y: centerY + verticalOffset, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
    { slotId: 'west', x: centerX - horizontalOffset, y: centerY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
    { slotId: 'east', x: centerX + horizontalOffset, y: centerY, width: cardWidth, height: cardHeight, rotateDeg: 0, zIndex: 24 },
  ])
}

function buildSpreadResult(
  cardWidth: number,
  cardHeight: number,
  stageShiftY: number,
  cards: SpreadCardLayout[],
): SpreadLayoutResult {
  return {
    cardWidth,
    cardHeight,
    stageShiftY,
    cards,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
