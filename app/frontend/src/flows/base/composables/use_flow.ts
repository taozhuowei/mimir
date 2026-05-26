/**
 * Name: flows/base/composables/use_flow
 * Purpose: re-export the application-level flow ref from the tarot store and
 *          provide named transition helpers (see docs/state.md 应用级流程).
 *          Three flow states: idle / divination / answer.
 * Reason: views/containers depend on `Flow` not the store implementation —
 *         this composable is the DDD seam so the store layer can evolve
 *         without touching the consumers.
 * Data flow: tarotStore.flow ──▶ useFlow().flow ──▶ provide('flow').
 */

import { storeToRefs } from 'pinia'
import { useTarotStore } from '../../../core/store/tarot'
import type { Flow } from '../../../core/store/slices/flow'

export type { Flow } from '../../../core/store/slices/flow'

export interface UseFlowReturn {
  flow: ReturnType<typeof storeToRefs<ReturnType<typeof useTarotStore>>>['flow']
  /** Move to `divination` and clear any previous answer. */
  startDivination: (question: string) => void
  /** Move to terminal `answer` once the reading payload has settled. */
  enterAnswer: () => void
  /** Reset the whole flow back to `idle`. */
  resetToIdle: () => void
  /** Imperative override (escape hatch — prefer the named transitions). */
  setFlow: (next: Flow) => void
}

export function useFlow(): UseFlowReturn {
  const tarotStore = useTarotStore()
  const { flow } = storeToRefs(tarotStore)

  return {
    flow,
    startDivination: (question: string) => tarotStore.startDivination(question),
    enterAnswer: () => tarotStore.enterAnswer(),
    resetToIdle: () => tarotStore.reset(),
    setFlow: (next: Flow) => tarotStore.setFlow(next),
  }
}
