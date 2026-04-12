/**
 * Name: reading_orchestrator
 * Purpose: manage reading request lifecycle with retry and state tracking.
 * Reason: decouple reading request orchestration from overlay animation and store.
 * Data flow: reading request triggers flow in; status and results flow out.
 */

import type { Ref } from 'vue'
import type { ReadingResult } from '../tarotReading'
import type { ReadingProvider, ReadingRequest } from './reading_provider'

export type ReadingStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ReadingOrchestratorState {
  status: ReadingStatus
  result: ReadingResult | null
  error: string | null
  isLoading: boolean
  canRetry: boolean
}

export interface ReadingOrchestrator {
  state: ReadingOrchestratorState
  start(request: ReadingRequest): Promise<ReadingResult | null>
  retry(request?: ReadingRequest): Promise<ReadingResult | null>
  reset(): void
}

export interface ReadingOrchestratorDeps {
  provider: ReadingProvider
  statusRef: Ref<ReadingStatus>
  resultRef: Ref<ReadingResult | null>
  errorRef: Ref<string | null>
  errorMessage: string
}

export function createReadingOrchestrator(deps: ReadingOrchestratorDeps): ReadingOrchestrator {
  const { provider, statusRef, resultRef, errorRef, errorMessage } = deps
  let currentRequest: Promise<ReadingResult | null> | null = null
  let lastRequest: ReadingRequest | null = null

  function getState(): ReadingOrchestratorState {
    return {
      status: statusRef.value,
      result: resultRef.value,
      error: errorRef.value,
      isLoading: statusRef.value === 'loading',
      canRetry: statusRef.value === 'error',
    }
  }

  async function executeRequest(request: ReadingRequest): Promise<ReadingResult | null> {
    if (currentRequest) {
      return currentRequest
    }

    statusRef.value = 'loading'
    errorRef.value = null

    currentRequest = provider.requestReading(request)
      .then((result) => {
        resultRef.value = result
        statusRef.value = 'success'
        return result
      })
      .catch((err: unknown) => {
        errorRef.value = err instanceof Error ? err.message : errorMessage
        statusRef.value = 'error'
        return null
      })
      .finally(() => {
        currentRequest = null
      })

    return currentRequest
  }

  return {
    get state() {
      return getState()
    },
    async start(request: ReadingRequest) {
      lastRequest = request
      if (resultRef.value) {
        statusRef.value = 'success'
        return resultRef.value
      }
      return executeRequest(request)
    },
    async retry(request?: ReadingRequest) {
      const requestToUse = request ?? lastRequest
      if (!requestToUse) {
        return null
      }
      errorRef.value = null
      statusRef.value = 'idle'
      return executeRequest(requestToUse)
    },
    reset() {
      statusRef.value = 'idle'
      resultRef.value = null
      errorRef.value = null
      lastRequest = null
      currentRequest = null
    },
  }
}

/**
 * Schedule a reading request with optional delay.
 */
export function scheduleReadingRequest(
  orchestrator: ReadingOrchestrator,
  request: ReadingRequest,
  delayMs: number,
): () => void {
  if (orchestrator.state.result) {
    return () => {}
  }

  const timer = setTimeout(() => {
    void orchestrator.start(request)
  }, delayMs)

  return () => clearTimeout(timer)
}
