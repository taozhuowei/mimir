/**
 * Name: flows/divination/composables/lifecycle_scene
 * Purpose: overlay scene visual-state operations — entry settle and full reset.
 *          Extracted from use_lifecycle so that orchestrator stays focused on
 *          pipeline wiring.
 * Data flow: closes over LifecycleDeps; mutates shared animState refs in place.
 */

import type { LifecycleDeps } from './use_lifecycle_types'

export interface LifecycleScene {
  settleEntryAnimation: () => void
  resetOverlayScene: () => void
}

export function createLifecycleScene(deps: LifecycleDeps): LifecycleScene {
  function settleEntryAnimation(): void {
    const { animState, entryAnimationComplete } = deps
    animState.bg.opacity = 1
    animState.refreshBg()
    animState.initials.forEach((state, index) => {
      Object.assign(state, { x: 0, y: -(index * 0.8), rotation: 0, scale: 1, scaleY: 1, opacity: 1 })
    })
    animState.refreshInitials()
    animState.header.y = 0
    animState.header.opacity = 1
    animState.footer.y = 0
    animState.footer.opacity = 1
    animState.refreshHeader()
    animState.refreshFooter()
    entryAnimationComplete.value = true
  }

  function resetOverlayScene(): void {
    deps.showResults.value = false
    deps.cardsLanded.value = false
    deps.callbacks.onResetAnswer()
    const { animState } = deps
    animState.bg.opacity = 1
    animState.stage.y = 0
    animState.header.y = 0
    animState.header.opacity = 1
    animState.footer.y = 0
    animState.footer.opacity = 1
    animState.deckCtn.x = 0
    animState.refreshBg()
    animState.refreshStage()
    animState.refreshHeader()
    animState.refreshFooter()
    animState.refreshDeckCtn()
    animState.resetInitialDeckState()
    animState.resetShuffleVisualState()
    animState.resetCutVisualState()
    animState.resetDrawVisualState()
    const drawLayout = deps.getSceneLayout('draw_stage')
    animState.setDrawCardSizes(drawLayout)
  }

  return { settleEntryAnimation, resetOverlayScene }
}
