// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createReadingOrchestrator } from '../app/src/utils/reading/reading_orchestrator'
import type { ReadingProvider, ReadingRequest } from '../app/src/utils/reading/reading_provider'
import type { ReadingResult } from '../app/src/utils/tarot_reading'

function makeMockProvider(result: ReadingResult | null = null, shouldReject = false): ReadingProvider {
  return {
    type: 'offline',
    requestReading: vi.fn().mockImplementation(() => {
      if (shouldReject) {
        return Promise.reject(new Error('Test error'))
      }
      return Promise.resolve(result!)
    }),
    isAvailable: vi.fn().mockReturnValue(true),
  }
}

function makeReadingResult(): ReadingResult {
  return {
    result: 'positive',
    score: 5,
    cardDetails: [],
  }
}

function makeRequest(): ReadingRequest {
  return {
    cards: [],
    spreadKind: 'three_card',
    question: 'Test question',
  }
}

describe('reading_orchestrator retry', () => {
  let statusRef: ReturnType<typeof ref<'idle' | 'loading' | 'success' | 'error'>>
  let resultRef: ReturnType<typeof ref<ReadingResult | null>>
  let errorRef: ReturnType<typeof ref<string | null>>

  beforeEach(() => {
    statusRef = ref('idle')
    resultRef = ref(null)
    errorRef = ref(null)
  })

  it('retries with stored request when no request provided', async () => {
    const result = makeReadingResult()
    const provider = makeMockProvider(result)
    const orchestrator = createReadingOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      errorMessage: 'Default error',
    })

    const request = makeRequest()
    await orchestrator.start(request)
    expect(provider.requestReading).toHaveBeenCalledTimes(1)

    // Simulate error state
    statusRef.value = 'error'
    errorRef.value = 'Test error'

    const retryResult = await orchestrator.retry()
    expect(retryResult).toStrictEqual(result)
    // Should have been called twice (original + retry)
    expect(provider.requestReading).toHaveBeenCalledTimes(2)
    expect(statusRef.value).toBe('success')
  })

  it('retries with provided request when given', async () => {
    const result = makeReadingResult()
    const provider = makeMockProvider(result)
    const orchestrator = createReadingOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      errorMessage: 'Default error',
    })

    // Start with first request
    await orchestrator.start(makeRequest())
    expect(provider.requestReading).toHaveBeenCalledTimes(1)

    // Simulate error state
    statusRef.value = 'error'
    errorRef.value = 'Test error'

    // Retry with a new request
    const newRequest: ReadingRequest = {
      cards: [],
      spreadKind: 'single_card',
    }
    const retryResult = await orchestrator.retry(newRequest)
    expect(retryResult).toStrictEqual(result)
    expect(provider.requestReading).toHaveBeenCalledTimes(2)
  })

  it('returns null when retry called without prior start and no request provided', async () => {
    const orchestrator = createReadingOrchestrator({
      provider: makeMockProvider(),
      statusRef,
      resultRef,
      errorRef,
      errorMessage: 'Default error',
    })

    // Try to retry without ever starting
    const retryResult = await orchestrator.retry()
    expect(retryResult).toBeNull()
  })

  it('retries from error state and transitions through loading to success', async () => {
    const result = makeReadingResult()
    const provider = makeMockProvider(result)
    const orchestrator = createReadingOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      errorMessage: 'Default error',
    })

    const request = makeRequest()
    await orchestrator.start(request)

    // Simulate error
    statusRef.value = 'error'
    errorRef.value = 'Network error'

    expect(orchestrator.state.canRetry).toBe(true)

    const retryPromise = orchestrator.retry()
    expect(statusRef.value).toBe('loading')
    expect(errorRef.value).toBeNull()

    const retryResult = await retryPromise
    expect(retryResult).toStrictEqual(result)
    expect(statusRef.value).toBe('success')
    expect(orchestrator.state.canRetry).toBe(false)
  })

  it('retries from error state and handles repeated failures', async () => {
    // First two calls fail (original + one auto-retry), third call (manual retry) succeeds
    const successResult = makeReadingResult()
    const provider = makeMockProvider()
    const requestMock = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce(successResult)
    provider.requestReading = requestMock

    const orchestrator = createReadingOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      errorMessage: 'Request failed',
    })

    const request = makeRequest()

    // First attempt fails after auto-retry also fails
    const firstResult = await orchestrator.start(request)
    expect(firstResult).toBeNull()
    expect(statusRef.value).toBe('error')
    expect(errorRef.value).toBe('Second failure')
    expect(provider.requestReading).toHaveBeenCalledTimes(2)

    // Manual retry succeeds
    const retryResult = await orchestrator.retry()
    expect(retryResult).toStrictEqual(successResult)
    expect(statusRef.value).toBe('success')
    expect(errorRef.value).toBeNull()
    expect(provider.requestReading).toHaveBeenCalledTimes(3)
  })
})
