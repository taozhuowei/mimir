/**
 * Name: reveal_animation
 * Purpose: pure reveal animation implementation - card flip and result panel reveal only.
 * Reason: allows reveal animation to be tested and swapped independently.
 * Data flow: current positions and layout metrics flow in; GSAP tween configs flow out.
 */

import gsap from 'gsap'
import type { CenterCardState, InnerState } from './types'
import type { OverlaySceneLayout } from '../overlay_layout'

export interface RevealAnimationConfig {
  cardCount: number
  drawLayout: OverlaySceneLayout
}

export interface RevealAnimationContext {
  stage: { y: number }
  draws: CenterCardState[]
  inners: InnerState[]
  drawsVisible: { value: boolean[] }
  initials: { opacity: number }[]
  refreshStage: () => void
  refreshDraws: () => void
  refreshInners: () => void
  refreshInitials: () => void
}

/**
 * Build reveal phase GSAP timeline.
 */
export function buildRevealTimeline(
  context: RevealAnimationContext,
  config: RevealAnimationConfig,
  onComplete: () => void,
): gsap.core.Timeline {
  const { stage, draws, inners, drawsVisible, initials } = context
  const { cardCount, drawLayout } = config
  const targetX = drawLayout.cards.map((c) => c.x)
  const targetY = drawLayout.cards.map((c) => c.y)

  const timeline = gsap.timeline({
    onUpdate: () => {
      context.refreshStage()
      context.refreshDraws()
      context.refreshInners()
    },
  })

  // Set initial state
  timeline.add(() => {
    stage.y = -drawLayout.stageShiftY
    context.refreshStage()

    initials.forEach((state) => { state.opacity = 0 })
    context.refreshInitials()

    const visible = [...drawsVisible.value]
    draws.forEach((state, index) => {
      if (index < cardCount) {
        Object.assign(state, {
          x: targetX[index],
          y: targetY[index],
          rotation: 0,
          scale: 1,
          opacity: 1,
          zIndex: 20 - index,
        })
        inners[index].rotationY = 0
        visible[index] = true
      } else {
        Object.assign(state, {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 0,
          zIndex: 20 - index,
        })
        inners[index].rotationY = 0
        visible[index] = false
      }
    })
    drawsVisible.value = visible
    context.refreshDraws()
    context.refreshInners()
  })

  // Flip animation
  const flipDuration = 1 + (cardCount - 1) * 0.4
  timeline.to(inners, {
    rotationY: 180,
    duration: 1,
    stagger: 0.4,
    ease: 'back.out(1.1)',
  }, 0.4)

  // Complete
  timeline.add(() => {
    onComplete()
  }, 0.4 + flipDuration + 0.4)

  return timeline
}

/**
 * Setup reveal initial state without animation.
 */
export function setupRevealInitialState(
  context: RevealAnimationContext,
  config: RevealAnimationConfig,
): void {
  const { stage, draws, inners, drawsVisible, initials } = context
  const { cardCount, drawLayout } = config
  const targetX = drawLayout.cards.map((c) => c.x)
  const targetY = drawLayout.cards.map((c) => c.y)

  stage.y = -drawLayout.stageShiftY
  context.refreshStage()

  initials.forEach((state) => { state.opacity = 0 })
  context.refreshInitials()

  const visible = [...drawsVisible.value]
  draws.forEach((state, index) => {
    if (index < cardCount) {
      Object.assign(state, {
        x: targetX[index],
        y: targetY[index],
        rotation: 0,
        scale: 1,
        opacity: 1,
        zIndex: 20 - index,
      })
      inners[index].rotationY = 180
      visible[index] = true
    } else {
      Object.assign(state, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 0,
        zIndex: 20 - index,
      })
      inners[index].rotationY = 0
      visible[index] = false
    }
  })
  drawsVisible.value = visible
  context.refreshDraws()
  context.refreshInners()
}
