/**
 * Name: cut_animation
 * Purpose: pure cut animation implementation - state transitions only, no orchestration.
 * Reason: allows cut animation to be tested and swapped independently.
 * Data flow: cut layout offsets flow in; GSAP tween configs and state updates flow out.
 */

import gsap from 'gsap'
import type { OverlayCutLayoutResult } from '../overlay_layout'
import type { CenterCardState } from './types'

export interface CutAnimationConfig {
  layout: OverlayCutLayoutResult
}

export interface CutAnimationContext {
  cutTop: CenterCardState
  cutMid: CenterCardState
  cutBot: CenterCardState
  cutTopVisible: { value: boolean }
  cutMidVisible: { value: boolean }
  cutBotVisible: { value: boolean }
  refreshCuts: () => void
}

/**
 * Build cut phase GSAP timeline.
 */
export function buildCutTimeline(
  context: CutAnimationContext,
  config: CutAnimationConfig,
  onComplete: () => void,
): gsap.core.Timeline {
  const { cutTop, cutMid, cutBot, cutTopVisible, cutMidVisible, cutBotVisible } = context
  const { layout } = config

  const timeline = gsap.timeline({
    onComplete,
    onUpdate: () => {
      context.refreshCuts()
    },
  })

  // Set up initial state
  timeline.add(() => {
    Object.assign(cutTop, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 10 })
    Object.assign(cutMid, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 10 })
    Object.assign(cutBot, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 10 })
    cutTopVisible.value = true
    cutMidVisible.value = true
    cutBotVisible.value = true
    context.refreshCuts()
  })

  // Cut animations
  timeline
    .to(cutTop, {
      x: layout.leadingOffsetX,
      y: layout.leadingOffsetY,
      duration: 0.7,
      ease: 'power3.out',
    })
    .to(cutBot, {
      x: layout.trailingOffsetX,
      y: layout.trailingOffsetY,
      duration: 0.7,
      ease: 'power3.out',
    }, '<')
    .to(cutTop, {
      x: layout.trailingOffsetX,
      y: layout.trailingOffsetY,
      zIndex: 11,
      duration: 0.7,
      ease: 'power2.inOut',
    }, '+=0.15')
    .to(cutMid, {
      x: 0,
      y: 0,
      zIndex: 12,
      duration: 0.7,
      ease: 'power2.inOut',
    }, '<')
    .to(cutBot, {
      x: layout.leadingOffsetX,
      y: layout.leadingOffsetY,
      zIndex: 13,
      duration: 0.7,
      ease: 'power2.inOut',
    }, '<')
    .to(cutTop, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.45,
      ease: 'power2.out',
    }, '+=0.2')
    .to(cutMid, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.45,
      ease: 'power2.out',
    }, '<')
    .to(cutBot, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.45,
      ease: 'power2.out',
    }, '<')
    .add(() => {
      cutTopVisible.value = false
      cutMidVisible.value = false
      cutBotVisible.value = false
      context.refreshCuts()
    })

  return timeline
}

/**
 * Create initial cut card states.
 */
export function createCutInitialStates(): {
  cutTop: CenterCardState
  cutMid: CenterCardState
  cutBot: CenterCardState
} {
  return {
    cutTop: { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 },
    cutMid: { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 },
    cutBot: { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 },
  }
}
