/**
 * Name: overlay_animation/index
 * Purpose: public exports for the overlay animation system.
 * Reason: clean public API with no circular imports.
 */

// Types
export type { OverlayPhase } from '../../core/flow/types'
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

// Initial state factories
export {
  createShuffleInitialStates,
  createCutInitialStates,
  createDrawInitialStates,
  type ShuffleInitialStates,
  type CutInitialStates,
  type DrawInitialStates,
} from './initial_states'
