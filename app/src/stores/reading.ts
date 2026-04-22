/**
 * Name: reading store module
 * Purpose: manage the async reading request lifecycle and result state.
 * Reason: separates reading concerns from divination flow and deck state.
 */

import { ref } from 'vue'
import { fetchReading } from '../api/readings'
import type { DrawnResult, ReadingResult } from '../utils/tarotReading'
import type { SpreadKind } from '../core/layout/spread_registry'

export function createReadingState() {
  const readingResult = ref<ReadingResult | null>(null)
  const isReadingLoading = ref(false)
  const readingError = ref<string | null>(null)

  // Track the current reading request to guard against stale responses
  const currentReadingRequestId = ref<number>(0)
  let pendingReadingPromise: Promise<ReadingResult | null> | null = null

  function invalidateReadingRequest() {
    currentReadingRequestId.value += 1
    pendingReadingPromise = null
    isReadingLoading.value = false
  }

  /**
   * Start the async reading request. Returns a promise that resolves when
   * the reading result arrives. Stale responses are automatically ignored.
   */
  async function startReadingRequest(
    drawn: DrawnResult[],
    spreadKind: SpreadKind,
  ): Promise<ReadingResult | null> {
    if (pendingReadingPromise) {
      return pendingReadingPromise
    }

    if (drawn.length === 0) {
      return null
    }

    const requestId = ++currentReadingRequestId.value
    isReadingLoading.value = true
    readingError.value = null

    pendingReadingPromise = (async () => {
      const result = await fetchReading(drawn, spreadKind)

      if (requestId !== currentReadingRequestId.value) {
        return null
      }

      readingResult.value = result
      return result
    })()
      .catch((err: unknown) => {
        if (requestId !== currentReadingRequestId.value) {
          return null
        }

        readingError.value = err instanceof Error ? err.message : 'Failed to load reading'
        throw err
      })
      .finally(() => {
        if (requestId === currentReadingRequestId.value) {
          isReadingLoading.value = false
          pendingReadingPromise = null
        }
      })

    return pendingReadingPromise
  }

  function waitForReadingResult(): Promise<ReadingResult | null> {
    if (pendingReadingPromise) {
      return pendingReadingPromise
    }
    return Promise.resolve(readingResult.value)
  }

  function reset() {
    readingResult.value = null
    readingError.value = null
    invalidateReadingRequest()
  }

  return {
    readingResult,
    isReadingLoading,
    readingError,
    startReadingRequest,
    waitForReadingResult,
    invalidateReadingRequest,
    reset,
  }
}
