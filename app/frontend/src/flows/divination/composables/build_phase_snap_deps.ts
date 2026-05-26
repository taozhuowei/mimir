/**
 * Name: flows/divination/composables/build_phase_snap_deps
 * Purpose: assemble the PhaseSnapDeps bundle consumed by PHASE_MANIFEST.snapToEntryState
 *          helpers. Read fresh on each call so layout/metric changes (orientation,
 *          resize) are picked up — the snap helpers themselves are pure functions.
 * Data flow: reads live layout/metrics from LifecycleDeps; returns a plain deps bundle.
 */

import type { PhaseSnapDeps } from './phase_entry_snap'
import type { LifecycleDeps } from './use_lifecycle_types'

export function buildPhaseSnapDeps(deps: LifecycleDeps): PhaseSnapDeps {
  const drawLayout = deps.getSceneLayout('draw_stage')
  const metrics = deps.getMotionMetrics('draw_stage')
  const { centerX, centerY } = deps.getDeckCenter()
  return {
    cardElements: deps.cardElements,
    visible: deps.visible,
    draws: deps.animState.draws,
    deckGeometry: { centerX, centerY },
    drawLayout,
    cardCount: deps.cardCount.value,
    cutPileCount: deps.cutPileCount,
    shuffleSpreadX: metrics.shuffleSpreadX,
    cutPileSpacing: metrics.cutPileSpacing,
    cutAxis: metrics.cutAxis,
    setDrawCardSizes: (layout) => deps.animState.setDrawCardSizes(layout),
  }
}
