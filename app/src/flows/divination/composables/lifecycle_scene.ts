/**
 * Name: flows/divination/composables/lifecycle_scene
 * Purpose: overlay scene visual-state operations — entry settle, full reset, and
 *          in-flight animation interruption. Extracted from use_lifecycle so that
 *          orchestrator stays focused on pipeline wiring.
 * Data flow: closes over LifecycleDeps; mutates shared animState refs in place.
 */

import { killAnimationTargets } from '../../../core/gsap/tween'
import type { LifecycleDeps } from './use_lifecycle_types'

export interface LifecycleScene {
  settleEntryAnimation: () => void
  resetOverlayScene: () => void
  interruptCurrentAnimation: () => void
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

  function interruptCurrentAnimation(): void {
    // 中断只丢弃当前 in-flight 请求并重置状态，不销毁 orchestrator；
    // 销毁会让 destroyed=true 永久禁用后续 startAnswer，使 dev replay/skip
    // 路径的二次请求被吞掉、settlePipeline 永远读到 status='idle' 而无法切阶段。
    deps.callbacks.onResetAnswer()
    deps.resumeAnimations()
    deps.orchestrator.clear()
    killAnimationTargets(deps.animState.getAllTargets())
  }

  return { settleEntryAnimation, resetOverlayScene, interruptCurrentAnimation }
}
