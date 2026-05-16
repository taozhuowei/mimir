/**
 * Name: overlay_progress/index
 * Purpose: public API for the overlay progress system.
 * Reason: readable imports with no unrelated exports.
 */

export {
  createProgressModel,
  calculatePhaseProgress,
  type ProgressModel,
  type ProgressState,
  type PhaseProgressItem,
} from './phase_progress_model'

export {
  presentProgressHeader,
  presentFooter,
  // Note: `presentPositionBadge` and `DEFAULT_OVERLAY_TEXT` are intentionally
  // NOT re-exported here. Both are consumed only by tests, which import from
  // the inner module directly; the one runtime barrel consumer of
  // DEFAULT_OVERLAY_TEXT (use_overlay.ts) was removed, so re-exporting it
  // through the facade makes knip flag it as a dead export. Add the
  // re-export back if a runtime caller ever needs it.
  type ProgressBarItem,
  type ProgressHeaderPresentation,
  type FooterPresentation,
  type OverlayText,
} from './phase_progress_presenter'
