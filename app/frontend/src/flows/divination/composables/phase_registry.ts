/**
 * Name: flows/divination/composables/phase_registry
 * Purpose: single source of truth for phase ordering + metadata
 *          (PHASE_MANIFEST), its backward-compat progress-UI projection
 *          (PHASE_STEPS), and the derived lookup / sequence helpers.
 * Reason: split out of registry.ts so the manifest data + queries are one module.
 * Data flow: PHASE_MANIFEST is the single source of truth — PHASE_STEPS is a
 *          backward-compat projection for the progress UI.
 */

import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'

/**
 * Progress-bar metadata for one phase. Absorbed verbatim from the former
 * phase_types during the flows refactor.
 */
export interface PhaseStep {
  phase: OverlayPhase
  label: string
  activeIcon: string
  inactiveIcon: string
}

/**
 * PhaseManifest — single source of truth for the progress-bar metadata.
 * Ordering of this array defines the pipeline order (consumed by
 * buildPhaseRunners / getPhaseOrder). Absorbed verbatim from the former
 * phase_types during the flows refactor.
 */
export interface PhaseManifest {
  phase: OverlayPhase
  label: string
  activeIcon: string
  inactiveIcon: string
}

/**
 * Single source of truth for phase ordering and metadata. The pipeline
 * builder and progress UI all derive from this.
 */
export const PHASE_MANIFEST: PhaseManifest[] = [
  {
    phase: 'shuffling',
    label: '洗牌',
    activeIcon: 'icon_wands',
    inactiveIcon: 'icon_wands_inactive',
  },
  {
    phase: 'cutting',
    label: '切牌',
    activeIcon: 'icon_swords',
    inactiveIcon: 'icon_swords_inactive',
  },
  {
    phase: 'drawing',
    label: '抽牌',
    activeIcon: 'icon_cups',
    inactiveIcon: 'icon_cups_inactive',
  },
  {
    phase: 'revealing',
    label: '翻牌',
    activeIcon: 'icon_pentacles',
    inactiveIcon: 'icon_pentacles_inactive',
  },
]

/**
 * Backward-compat projection — PHASE_STEPS keeps the old shape so existing
 * progress-UI consumers (phase_progress_presenter, phase_progress_model) need
 * no changes when the manifest gains new fields.
 */
export const PHASE_STEPS: PhaseStep[] = PHASE_MANIFEST.map(
  ({ phase, label, activeIcon, inactiveIcon }) => ({ phase, label, activeIcon, inactiveIcon }),
)

export function getPhaseIndex(phase: OverlayPhase): number {
  return PHASE_MANIFEST.findIndex((s) => s.phase === phase)
}

export function getPhaseStep(phase: OverlayPhase): PhaseStep | undefined {
  return PHASE_STEPS.find((s) => s.phase === phase)
}

export function isValidPhase(phase: string): phase is OverlayPhase {
  return PHASE_MANIFEST.some((s) => s.phase === phase)
}

export function getPhaseSteps(): PhaseStep[] {
  return PHASE_STEPS
}

export function getNextPhase(phase: OverlayPhase): OverlayPhase | null {
  const index = getPhaseIndex(phase)
  if (index < 0 || index >= PHASE_MANIFEST.length - 1) {
    return null
  }
  return PHASE_MANIFEST[index + 1].phase
}

/**
 * Phase ordering derived from the manifest — used by the pipeline builder
 * and any caller that needs the canonical sequence as plain phase names.
 */
export function getPhaseOrder(): OverlayPhase[] {
  return PHASE_MANIFEST.map((m) => m.phase)
}
