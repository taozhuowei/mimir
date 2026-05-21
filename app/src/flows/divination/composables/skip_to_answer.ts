/**
 * Name: flows/divination/composables/skip_to_answer
 * Purpose: skip directly to the revealing phase, bypassing shuffle/cut/draw animations.
 * Reason: extracted from the phase pipeline to isolate skip logic as a standalone command.
 *         Now reuses the manifest's snap-to-revealing-entry helper so the visual state
 *         contract for revealing lives in one place (registry.ts) — previously this
 *         command hand-rolled a draws[i] assignment loop that drifted from the contract.
 * Data flow: deps in → interrupts timeline, resets scene, snaps to revealing entry
 *         visual state via PHASE_MANIFEST, opens reading panel, fires onPipelineComplete.
 */

import type { Ref } from 'vue'
import { getPhaseSnap } from './phase_registry'
import type { PhaseSnapDeps } from './phase_entry_snap'
import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'

export interface SkipToAnswerCommandDeps {
  interruptCurrentAnimation: () => void
  entryAnimationComplete: Ref<boolean>
  resetOverlayScene: () => void
  transitionPhase: (phase: OverlayPhase) => void
  openAnswer: () => void
  refreshDraws: () => void
  onPipelineComplete: () => void
  getPhaseSnapDeps: () => PhaseSnapDeps
}

export function skipToAnswerCommand(deps: SkipToAnswerCommandDeps): void {
  deps.interruptCurrentAnimation()
  deps.entryAnimationComplete.value = true
  deps.resetOverlayScene()

  // Snap visual state to revealing entry — sets card sizes, positions
  // each draw at its draw-stage target, hides unused draws and piles.
  getPhaseSnap('revealing')(deps.getPhaseSnapDeps())
  deps.refreshDraws()

  deps.transitionPhase('revealing')
  deps.openAnswer()
  deps.onPipelineComplete()
}
