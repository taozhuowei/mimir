/**
 * Name: commands/replay_from_phase
 * Purpose: replay the animation pipeline starting from a specified phase.
 * Reason: extracted from phase_pipeline to isolate replay logic as a standalone command.
 * Data flow: deps in → interrupts current animation, resets scene, runs pipeline from target index.
 */

import type { Ref } from 'vue'
import { getPhaseIndex } from '../../animation/phases/registry'
import type { OverlayPhase } from '../../core/flow/types'
import type { ProgressModel } from '../../utils/overlay_progress/phase_progress_model'

export interface ReplayFromPhaseCommandDeps {
  interruptCurrentAnimation: () => void
  entryAnimationComplete: Ref<boolean>
  resetOverlayScene: () => void
  phaseRef: Ref<OverlayPhase>
  progressModel: ProgressModel
  onPhaseChange: (phase: OverlayPhase) => void
  runPipelineFn: (startIndex: number) => void
}

export function replayFromPhaseCommand(
  targetPhase: OverlayPhase,
  deps: ReplayFromPhaseCommandDeps,
): void {
  deps.interruptCurrentAnimation()
  deps.entryAnimationComplete.value = true
  deps.resetOverlayScene()
  deps.phaseRef.value = targetPhase
  deps.progressModel.transitionTo(targetPhase)
  deps.onPhaseChange(targetPhase)

  const startIndex = getPhaseIndex(targetPhase)
  deps.runPipelineFn(startIndex)
}
