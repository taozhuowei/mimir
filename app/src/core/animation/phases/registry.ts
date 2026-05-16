/**
 * Name: animation/phases/registry
 * Purpose: facade for the overlay phase system — aggregates the type
 *          contract (`phase_types`), the replay/skip entry-state helpers
 *          (`phase_entry_snaps`), and the manifest + queries
 *          (`phase_manifest`) behind the historical `phases/registry`
 *          import path so every external importer stays unchanged.
 * Reason: the registry had grown to mix three concerns — the type/constant
 *          contract, the divination replay snap logic, and the manifest +
 *          queries. Split into focused modules while preserving the public
 *          surface exactly. The snap helpers are intentionally NOT
 *          re-exported (no external consumers; re-exporting would make knip
 *          flag them as dead exports).
 * Data flow: PHASE_MANIFEST is the single source of truth — PHASE_STEPS is a
 *          backward-compat projection for the progress UI; getPhaseSnap()
 *          looks up the entry-state setter for replay/skip dispatchers.
 */

export type {
  OverlayPhase,
  PhaseStep,
  PhaseSnapDeps,
  PhaseManifest,
} from './phase_types'
export { MAX_CUT_PILES } from './phase_types'
export {
  PHASE_MANIFEST,
  PHASE_STEPS,
  getPhaseIndex,
  getPhaseStep,
  isValidPhase,
  getPhaseSteps,
  getNextPhase,
  getPhaseOrder,
  getPhaseSnap,
} from './phase_manifest'
