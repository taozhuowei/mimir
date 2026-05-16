/**
 * Name: animation/phases/phase_types
 * Purpose: pure type + constant contract for the overlay phase system —
 *          OverlayPhase re-export, MAX_CUT_PILES, PhaseStep, PhaseSnapDeps,
 *          PhaseManifest. No runtime logic.
 * Reason: split out of registry.ts so the phase metadata / snap contract is
 *          a dependency-free type module that the snap helpers and the
 *          manifest both build on without import cycles.
 */

import type { OverlayPhase, PhaseContext } from '../../flow/types'
import type { DrawCardState } from '../types'
import type { SceneLayout } from '../../sizing/layout_solver'
export type { OverlayPhase } from '../../flow/types'

/** Maximum number of cut piles the cut animation pre-allocates. */
export const MAX_CUT_PILES = 8

export interface PhaseStep {
  phase: OverlayPhase
  label: string
  activeIcon: string
  inactiveIcon: string
}

/**
 * Dependencies required by snapToEntryState helpers.
 *
 * The replay / skip commands construct one of these and pass it to the
 * matching snap helper; each helper writes the minimum shared visual state
 * its phase's builder *expects to see when run() is called*.
 *
 * Style refresh contract: the snap helpers mutate plain objects inside
 * `cardElements.lefts/rights/piles` and `draws`. The style reconciler
 * (createStyleReconciler) installs `watch(..., { deep: true })` on every
 * one of these arrays, so any field write is auto-picked-up on the next
 * tick — no explicit `refreshLefts/refreshRights/refreshPiles/refreshDraws`
 * call is required from the snap path. The replay command's `await
 * nextTick()` before `runPipelineFn` guarantees those reactive updates
 * have flushed to the DOM before phase builders read element refs.
 *
 * `setDrawCardSizes` is the one exception: it ALSO writes to `layoutCard*`
 * refs (not to `state.draws`), so it must be called explicitly when a snap
 * needs to set draw sizes (see snapToRevealingEntry).
 */
export interface PhaseSnapDeps {
  cardElements: PhaseContext['cardElements']
  visible: PhaseContext['visible']
  draws: DrawCardState[]
  deckGeometry: { centerX: number; centerY: number }
  drawLayout: SceneLayout
  cardCount: number
  cutPileCount: number
  shuffleSpreadX: number
  cutPileSpacing: number
  cutAxis: 'horizontal' | 'vertical'
  setDrawCardSizes(layout: SceneLayout): void
}

/**
 * PhaseManifest — single source of truth for both the progress-bar metadata
 * and the per-phase entry-state setter. Ordering of this array defines the
 * pipeline order (consumed by buildPhaseRunners / getPhaseOrder).
 */
export interface PhaseManifest {
  phase: OverlayPhase
  label: string
  activeIcon: string
  inactiveIcon: string
  snapToEntryState(deps: PhaseSnapDeps): void
}
