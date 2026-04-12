/**
 * Name: draw_animation
 * Purpose: pure draw animation implementation - card dealing motion only, no orchestration.
 * Reason: allows draw animation to be tested and swapped independently.
 * Data flow: target positions and layout metrics flow in; GSAP tween configs flow out.
 */

import gsap from 'gsap'
import type { CenterCardState, InnerState } from './types'

export interface DrawAnimationConfig {
  cardCount: number
  cardHeight: number
  stageHeight: number
  liftY: number
  targetX: number[]
  targetY: number[]
  focusScale: number
  autoRevealDelayMs: number
}

export interface DrawAnimationContext {
  stage: { y: number }
  initials: { opacity: number; y: number; scale: number; rotation: number }[]
  draws: CenterCardState[]
  inners: InnerState[]
  drawsVisible: { value: boolean[] }
  deckCtn: { x: number }
  refreshStage: () => void
  refreshInitials: () => void
  refreshDraws: () => void
  refreshInners: () => void
  refreshDeckCtn: () => void
  onPhaseChange: (phase: 'revealing') => void
}

/**
 * Build draw phase GSAP timeline.
 */
export function buildDrawTimeline(
  context: DrawAnimationContext,
  config: DrawAnimationConfig,
  onComplete: () => void,
): gsap.core.Timeline {
  const { initials, draws, inners, drawsVisible, stage, deckCtn } = context
  const {
    cardCount,
    cardHeight,
    stageHeight,
    liftY,
    targetX,
    targetY,
    focusScale,
    autoRevealDelayMs,
  } = config

  const drawStartTime = 0.88
  const perCardDelay = 0.34
  const pullDuration = 0.18
  const fallDuration = 0.78
  const reboundDuration = 0.34
  const settleDuration = 0.82
  const stageFollowStart = drawStartTime + pullDuration - 0.02
  const deckExitStart = stageFollowStart + 0.06

  const lastCardLandingTime = drawStartTime
    + (cardCount - 1) * perCardDelay
    + pullDuration
    + fallDuration
    + reboundDuration
    + settleDuration

  const alignTime = lastCardLandingTime + 0.28
  const flipDuration = 1 + (cardCount - 1) * 0.4
  const revealDelay = autoRevealDelayMs / 1000
  const revealingStart = alignTime + 1.2 + flipDuration + 0.1 + revealDelay
  const finishTime = revealingStart + 0.3

  const preRotations = Array.from({ length: cardCount }, () => (Math.random() - 0.5) * 15)

  const timeline = gsap.timeline({
    onUpdate: () => {
      context.refreshDeckCtn()
      context.refreshStage()
      context.refreshInitials()
      context.refreshDraws()
      context.refreshInners()
    },
  })

  // Stage lift
  timeline
    .to(stage, {
      y: -liftY * 0.84,
      duration: 0.92,
      ease: 'power2.inOut',
    }, stageFollowStart)
    .to(stage, {
      y: -liftY,
      duration: 0.58,
      ease: 'power3.out',
    }, '>')

  // Deck exit
  timeline.to(initials, {
    opacity: 0,
    y: (index: number) => -cardHeight * 1.12 - index * 1.6,
    scale: 0.74,
    rotation: (index: number) => (index - 5.5) * 0.7,
    duration: 1.08,
    stagger: 0.018,
    ease: 'power2.in',
  }, deckExitStart)

  // Per-card deal animations
  for (let i = 0; i < cardCount; i++) {
    const cardTime = drawStartTime + i * perCardDelay

    // Card appearance
    timeline.add(() => {
      Object.assign(draws[i], {
        x: 0,
        y: i === 0 ? 0 : -stageHeight,
        rotation: 0,
        scale: 0.98,
        opacity: 1,
        zIndex: 20 - i,
      })
      const visible = [...drawsVisible.value]
      visible[i] = true
      drawsVisible.value = visible
      context.refreshDraws()
    }, cardTime)

    // Pull
    timeline.to(draws[i], {
      x: targetX[i] * 0.08,
      y: -cardHeight * 0.18,
      rotation: preRotations[i],
      scale: 1.03,
      duration: pullDuration,
      ease: 'power2.out',
    }, '>')

    // Fall
    timeline.to(draws[i], {
      x: targetX[i],
      y: targetY[i] + cardHeight * 0.86,
      duration: fallDuration,
      ease: 'power2.in',
    }, '>')

    // Rebound
    timeline.to(draws[i], {
      y: targetY[i] + cardHeight * 0.18,
      rotation: preRotations[i] * 0.3,
      scale: 0.98,
      duration: reboundDuration,
      ease: 'power2.out',
    }, '>')

    // Settle
    timeline.to(draws[i], {
      y: targetY[i],
      rotation: 0,
      scale: 1,
      duration: settleDuration,
      ease: 'power3.out',
    }, '>')
  }

  // Alignment
  timeline.to(draws, {
    x: (index: number) => targetX[index],
    y: (index: number) => targetY[index],
    rotation: 0,
    duration: 0.8,
    ease: 'power3.inOut',
  }, alignTime + 0.1)

  // Focus scale
  timeline.to(draws, {
    scale: focusScale,
    duration: 0.5,
    ease: 'power1.out',
  }, alignTime + 0.9)

  // Flip
  timeline.to(inners, {
    rotationY: 180,
    duration: 1,
    stagger: 0.4,
    ease: 'back.out(1.1)',
  }, alignTime + 1.2)

  // Phase change
  timeline.add(() => {
    context.onPhaseChange('revealing')
  }, revealingStart)

  // Complete
  timeline.add(() => {
    onComplete()
  }, finishTime)

  return timeline
}

/**
 * Create initial draw card states.
 */
export function createDrawInitialStates(maxCards: number): {
  draws: CenterCardState[]
  inners: InnerState[]
} {
  const draws: CenterCardState[] = Array.from({ length: maxCards }, (_, i) => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    opacity: 0,
    zIndex: 20 - i,
  }))

  const inners: InnerState[] = Array.from({ length: maxCards }, () => ({ rotationY: 0 }))

  return { draws, inners }
}
