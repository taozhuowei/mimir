/**
 * Name: flows/divination/composables/use_presentation
 * Purpose: derive progress header and footer UI state from phase + results.
 * Reason: extracted from use_animation_controller to isolate presentation computeds.
 * Data flow: receives phase and showResults refs via DI; returns computed-only presentation.
 */

import { computed } from 'vue'
import type { Ref } from 'vue'
import { presentProgressHeader, presentFooter } from './progress_presenter'
import type { OverlayPhase } from '../../base/composables/animations/phase_contracts'

export interface UsePresentationOptions {
  phase: Ref<OverlayPhase>
  showResults: Ref<boolean>
  getUiAsset: (name: string) => string
}

export function usePresentation(opts: UsePresentationOptions) {
  const progressHeaderPresentation = computed(() =>
    presentProgressHeader(opts.phase.value, opts.getUiAsset)
  )
  const footerPresentation = computed(() =>
    presentFooter(opts.phase.value, opts.showResults.value)
  )

  return { progressHeaderPresentation, footerPresentation }
}
