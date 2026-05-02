/**
 * Name: animation/phases/reveal
 * Purpose: revealing phase = compose growAtom (resize cards to result size)
 *          + flipAtom (rotate inners 0→180 to show face). Per design rule
 *          "card already enlarged before flipping": grow runs first, flip
 *          runs after grow completes.
 * Reason: previously the flip ran in the drawing phase on small face-down
 *          cards (incongruent with the design rule) and the reveal phase
 *          only resized. Atomising into growAtom + flipAtom and moving the
 *          flip here makes the cards visibly enlarge before flipping.
 * Data flow: phase entry resets draws to initial position+size+visibility,
 *          then growAtom + flipAtom compose into the timeline.
 */
import gsap from 'gsap'
import type { AnimationTimeline } from '../../../animation/engine'
import type { OverlayPhase, PhaseContext, PhaseRunner } from '../../../core/flow/types'
import { growAtom } from '../../atoms/grow'
import { flipAtom } from '../../atoms/flip'

export interface RevealPhaseConfig {
  cardCount: number
  drawCardWidth: number
  drawCardHeight: number
  resultCardWidth: number
  resultCardHeight: number
  drawLayout: {
    stageShiftY: number
    cards: { x: number; y: number }[]
  }
}

export function buildRevealPhaseRunner(config: RevealPhaseConfig): PhaseRunner {
  return {
    name: 'revealing' as OverlayPhase,
    run(context: PhaseContext, onComplete: () => void): AnimationTimeline {
      const { draws } = context.cardElements
      const { draws: drawsVisible } = context.visible
      const {
        cardCount,
        drawLayout,
        drawCardWidth,
        drawCardHeight,
        resultCardWidth,
        resultCardHeight,
      } = config
      const targetX = drawLayout.cards.map((c) => c.x)
      const targetY = drawLayout.cards.map((c) => c.y)

      const timeline = gsap.timeline({
        onComplete: () => { onComplete() },
      })

      // Phase entry: reset draws to draw-stage position + size + visibility.
      // scale stays 1 (size encoded in width/height, not transform).
      timeline.add(() => {
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
              width: drawCardWidth,
              height: drawCardHeight,
            })
            visible[index] = true
          } else {
            state.opacity = 0
            visible[index] = false
          }
        })
        drawsVisible.value = visible
      })

      // Atom 1: grow cards from draw size to result size. The +0.1 offset
      // keeps a small breath after phase entry before the resize starts.
      growAtom(
        timeline,
        context,
        {
          cardCount,
          fromWidth: drawCardWidth,
          fromHeight: drawCardHeight,
          toWidth: resultCardWidth,
          toHeight: resultCardHeight,
          duration: 0.75,
          ease: 'power2.out',
        },
        '+=0.1',
      )

      // Atom 2: flip cards face-up after grow completes.
      // '>' positions this tween at the end of the previous one.
      const flipPerCardDuration = 1
      const flipOverlapBudget = 1.4
      const flipStagger = cardCount > 1
        ? Math.min(0.4, flipOverlapBudget / (cardCount - 1))
        : 0
      flipAtom(
        timeline,
        context,
        {
          cardCount,
          targetRotation: 180,
          duration: flipPerCardDuration,
          stagger: flipStagger,
          ease: 'power3.out',
        },
        '>',
      )

      return timeline
    },
  }
}
