/**
 * Name: core/store/slices/reading
 * Purpose: state-slice factory holding the divination's interpretation
 *          result and request status refs that the reading orchestrator
 *          drives. Composed by the `tarot` Pinia store — this module is a
 *          pure factory, not a store itself.
 * Reason: separates reading concerns from divination flow and deck state.
 *         The orchestrator (see `utils/reading/reading_orchestrator.ts`)
 *         owns the request lifecycle now — this store only exposes the
 *         shared refs it writes into, so the rest of the app can subscribe.
 * Data flow: orchestrator writes `answerResult`/`isAnswerLoading`/
 *           `answerError`; templates and other stores read them.
 */

import { ref } from 'vue'
import type { AnswerResult } from '../../api/types'

export function createAnswerState() {
  const answerResult = ref<AnswerResult | null>(null)
  const isAnswerLoading = ref(false)
  const answerError = ref<string | null>(null)

  // A monotonic counter consumers can bump to ignore stale in-flight
  // responses (e.g. when restarting a divination mid-request).
  const currentAnswerRequestId = ref<number>(0)
  let pendingAnswerPromise: Promise<AnswerResult | null> | null = null

  function invalidateAnswerRequest() {
    currentAnswerRequestId.value += 1
    pendingAnswerPromise = null
    isAnswerLoading.value = false
  }

  function waitForAnswerResult(): Promise<AnswerResult | null> {
    if (pendingAnswerPromise) {
      return pendingAnswerPromise
    }
    return Promise.resolve(answerResult.value)
  }

  function reset() {
    answerResult.value = null
    answerError.value = null
    invalidateAnswerRequest()
  }

  return {
    answerResult,
    isAnswerLoading,
    answerError,
    waitForAnswerResult,
    invalidateAnswerRequest,
    reset,
  }
}
