/**
 * Name: shuffle_animation
 * Purpose: pure shuffle animation implementation - state transitions only, no orchestration.
 * Reason: allows shuffle animation to be tested and swapped independently.
 * Data flow: layout metrics flow in; GSAP tween configs and state updates flow out.
 */

import gsap from 'gsap'
import type { CardState } from './types'

export interface ShuffleAnimationConfig {
  layoutCardWidth: number
  spreadXRatio?: number
}

export interface ShuffleAnimationContext {
  initials: CardState[]
  lefts: CardState[]
  rights: CardState[]
  leftsVisible: { value: boolean }
  rightsVisible: { value: boolean }
  refreshInitials: () => void
  refreshLefts: () => void
  refreshRights: () => void
}

/**
 * Build shuffle phase GSAP timeline.
 */
export function buildShuffleTimeline(
  context: ShuffleAnimationContext,
  config: ShuffleAnimationConfig,
  onComplete: () => void,
): gsap.core.Timeline {
  const { initials, lefts, rights, leftsVisible, rightsVisible } = context
  const { layoutCardWidth, spreadXRatio = 0.85 } = config
  const spreadX = layoutCardWidth * spreadXRatio

  const timeline = gsap.timeline({
    onComplete,
    onUpdate: () => {
      context.refreshInitials()
      context.refreshLefts()
      context.refreshRights()
    },
  })

  // Set up initial shuffle state
  timeline.add(() => {
    initials.forEach((state) => { state.opacity = 0 })
    context.refreshInitials()

    lefts.forEach((state, index) => {
      state.opacity = 1
      state.x = 0
      state.y = -(index * 0.8)
      state.rotation = 0
      state.scale = 1
      state.scaleY = 1
    })

    rights.forEach((state, index) => {
      state.opacity = 1
      state.x = 0
      state.y = -4.8 - index * 0.8
      state.rotation = 0
      state.scale = 1
      state.scaleY = 1
    })

    leftsVisible.value = true
    rightsVisible.value = true
    context.refreshLefts()
    context.refreshRights()
  }, 0)

  // Spread animations
  timeline
    .to(lefts, {
      x: -spreadX,
      y: (index: number) => -30 - index * 0.8,
      rotation: -16,
      duration: 0.5,
      ease: 'power2.out',
    }, 0)
    .to(rights, {
      x: spreadX,
      y: (index: number) => 30 - index * 0.8,
      rotation: 16,
      duration: 0.5,
      ease: 'power2.out',
    }, '<')
    .to(lefts, {
      x: 0,
      y: (index: number) => -(index * 1.6),
      rotation: -2,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
    }, '+=0.2')
    .to(rights, {
      x: 0,
      y: (index: number) => -0.8 - index * 1.6,
      rotation: 2,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
    }, '<0.03')
    .add(() => {
      lefts.forEach((state) => { state.opacity = 0 })
      rights.forEach((state) => { state.opacity = 0 })
      leftsVisible.value = false
      rightsVisible.value = false
      context.refreshLefts()
      context.refreshRights()

      initials.forEach((state) => { state.opacity = 1; state.scaleY = 0.9 })
      context.refreshInitials()
    })
    .to(initials, {
      scaleY: 1,
      duration: 0.2,
      ease: 'power1.out',
    })

  return timeline
}

/**
 * Create initial state for shuffle animation groups.
 */
export function createShuffleInitialStates(): {
  initials: CardState[]
  lefts: CardState[]
  rights: CardState[]
} {
  const initials: CardState[] = Array.from({ length: 12 }, (_, i) => ({
    x: 0,
    y: -(i * 0.8),
    rotation: 0,
    scale: 1,
    scaleY: 1,
    opacity: 1,
  }))

  const lefts: CardState[] = Array.from({ length: 6 }, () => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    scaleY: 1,
    opacity: 0,
  }))

  const rights: CardState[] = Array.from({ length: 6 }, () => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    scaleY: 1,
    opacity: 0,
  }))

  return { initials, lefts, rights }
}
