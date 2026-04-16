/**
 * Name: overlay_animation/index
 * Purpose: public exports for the overlay animation system.
 * Reason: clean public API with no circular imports.
 */

// Types
export type { OverlayPhase } from './types'
export type {
  CardState,
  CenterCardState,
  InnerState,
  BackgroundState,
  StageState,
  HeaderState,
  FooterState,
  DeckContainerState,
} from './types'

// Registry / Pipeline / Orchestrator
export {
  PHASE_STEPS,
  getPhaseSteps,
  getPhaseIndex,
  getPhaseStep,
  isValidPhase,
  getNextPhase,
} from './phase_registry'
export type { PhaseStep } from './phase_registry'
export type { PipelinePhase, PhasePipeline } from './pipeline'
export { createPhasePipeline, getDefaultPhaseOrder } from './pipeline'
export {
  createTimelineOrchestrator,
  killAnimationTargets,
  type TimelineOrchestrator,
} from './timeline_orchestrator'

// Phase builders
export {
  createShuffleInitialStates,
  type ShufflePhaseConfig,
} from './phases/shuffle_phase'
export {
  createCutInitialStates,
  type CutPhaseConfig,
} from './phases/cut_phase'
export {
  createDrawInitialStates,
  type DrawPhaseConfig,
} from './phases/draw_phase'
