/**
 * Name: overlay_animations/index (compatibility shim)
 * Purpose: backward-compatible re-export of the new foldered animation system.
 */

export * from '../overlay_animation/types'
export {
  createShuffleInitialStates,
  type ShufflePhaseConfig as ShuffleAnimationConfig,
} from '../overlay_animation/phases/shuffle_phase'
export {
  createCutInitialStates,
  type CutPhaseConfig as CutAnimationConfig,
} from '../overlay_animation/phases/cut_phase'
export {
  createDrawInitialStates,
  type DrawPhaseConfig as DrawAnimationConfig,
} from '../overlay_animation/phases/draw_phase'
