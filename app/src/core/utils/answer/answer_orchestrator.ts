/**
 * Name: answer_orchestrator
 * Purpose: manage divination request lifecycle with retry and state tracking.
 * Reason: decouple divination orchestration from overlay animation and store.
 *         Backend now returns `{ drawn, reading }` together, so the
 *         orchestrator splits them into the appropriate refs (drawn ->
 *         flow store, reading -> reading store) and exposes only the
 *         reading result to its callers for back-compat with consumers
 *         that just want the interpretation.
 * Data flow: divination request triggers flow in; drawn cards land in
 *           `drawnRef`, reading lands in `resultRef`, and status/error
 *           flow through dedicated refs.
 */

import type { Ref } from 'vue'
import type { DrawnResult, AnswerResult } from '../../api/types'
import type { Divination } from '../../api/divinations'
import type { AnswerProvider, AnswerRequest } from './answer_provider'

export type AnswerStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AnswerOrchestratorState {
  status: AnswerStatus
  result: AnswerResult | null
  error: string | null
  isLoading: boolean
  canRetry: boolean
}

export interface AnswerOrchestrator {
  state: AnswerOrchestratorState
  start(request: AnswerRequest): Promise<AnswerResult | null>
  retry(request?: AnswerRequest): Promise<AnswerResult | null>
  reset(): void
  destroy(): void
}

export interface AnswerOrchestratorDeps {
  provider: AnswerProvider
  statusRef: Ref<AnswerStatus>
  resultRef: Ref<AnswerResult | null>
  errorRef: Ref<string | null>
  /**
   * Where to write the drawn cards returned by the server. The flow store
   * owns `drawnCards`; the orchestrator writes here directly so reveal
   * animations can read the freshly-drawn cards without a second round-trip.
   */
  drawnRef: Ref<DrawnResult[]>
  errorMessage: string
}

const TIMEOUT_MS = 15000
const RETRY_BACKOFF_MS = 1000

interface TimerRegistry {
  delay(ms: number): Promise<void>
  clearAll(): void
}

/**
 * Self-tracking setTimeout registry: each delay() timer auto-untracks on
 * fire; clearAll() cancels any still pending (used by destroy()).
 * Extracted from createAnswerOrchestrator verbatim — behaviour identical.
 */
function createTimerRegistry(): TimerRegistry {
  const pendingTimers: ReturnType<typeof setTimeout>[] = []

  function untrackTimer(id: ReturnType<typeof setTimeout>): void {
    const idx = pendingTimers.indexOf(id)
    if (idx >= 0) pendingTimers.splice(idx, 1)
  }

  return {
    delay(ms: number): Promise<void> {
      return new Promise((resolve) => {
        const id = setTimeout(() => {
          untrackTimer(id)
          resolve()
        }, ms)
        pendingTimers.push(id)
      })
    },
    clearAll(): void {
      for (const id of pendingTimers) clearTimeout(id)
      pendingTimers.length = 0
    },
  }
}

/**
 * Snapshot the orchestrator's public state from its refs. Extracted
 * verbatim from the previous inline getState().
 */
function readOrchestratorState(
  statusRef: Ref<AnswerStatus>,
  resultRef: Ref<AnswerResult | null>,
  errorRef: Ref<string | null>,
): AnswerOrchestratorState {
  return {
    status: statusRef.value,
    result: resultRef.value,
    error: errorRef.value,
    isLoading: statusRef.value === 'loading',
    canRetry: statusRef.value === 'error',
  }
}

export function createAnswerOrchestrator(deps: AnswerOrchestratorDeps): AnswerOrchestrator {
  const { provider, statusRef, resultRef, errorRef, drawnRef, errorMessage } = deps
  let currentRequest: Promise<AnswerResult | null> | null = null
  let lastRequest: AnswerRequest | null = null
  let destroyed = false
  const timers = createTimerRegistry()

  async function doRequest(request: AnswerRequest, retryCount: number): Promise<AnswerResult | null> {
    if (destroyed) return null

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('请求超时，请稍后重试')), TIMEOUT_MS)
    })

    try {
      const divination: Divination = await Promise.race([
        provider.requestAnswer(request),
        timeoutPromise,
      ])
      if (timeoutId) clearTimeout(timeoutId)
      // If the orchestrator was destroyed mid-request (e.g. user backed out
      // of the overlay), drop the response on the floor instead of leaking
      // it into a now-stale store. Without this, returning to a fresh flow
      // would briefly flash the previous run's cards.
      if (destroyed) return null
      // Drawn cards go to the flow store; reading goes to the reading store.
      // Order matters: write drawn first so any sync watcher on the reading
      // result already finds the drawn cards in place.
      drawnRef.value = divination.drawn
      resultRef.value = divination.answer
      statusRef.value = 'success'
      return divination.answer
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId)
      if (retryCount < 1 && !destroyed) {
        await timers.delay(RETRY_BACKOFF_MS)
        return doRequest(request, retryCount + 1)
      }
      errorRef.value = err instanceof Error ? err.message : errorMessage
      statusRef.value = 'error'
      return null
    }
  }

  async function executeRequest(request: AnswerRequest): Promise<AnswerResult | null> {
    if (destroyed) return null
    if (currentRequest) {
      return currentRequest
    }

    statusRef.value = 'loading'
    errorRef.value = null

    currentRequest = doRequest(request, 0).finally(() => {
      currentRequest = null
    })

    return currentRequest
  }

  return {
    get state() {
      return readOrchestratorState(statusRef, resultRef, errorRef)
    },
    async start(request: AnswerRequest) {
      lastRequest = request
      // If a result already exists, return it without re-requesting.
      // Callers must call reset() first if they want a fresh reading.
      if (resultRef.value) {
        statusRef.value = 'success'
        return resultRef.value
      }
      return executeRequest(request)
    },
    /**
     * Retry semantics changed with the protocol merge: the divinations
     * endpoint now draws + interprets in one transaction. A retry therefore
     * re-draws fresh cards (overwriting drawnRef) and produces a new
     * reading — there is no longer a way to keep the same draw and
     * re-interpret it.
     */
    async retry(request?: AnswerRequest) {
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
    destroy() {
      destroyed = true
      timers.clearAll()
      currentRequest = null
    },
  }
}
