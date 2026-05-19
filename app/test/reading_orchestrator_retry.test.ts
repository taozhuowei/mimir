// @vitest-environment node

/**
 * Reading orchestrator retry semantics (B2 protocol).
 * `retry` re-issues the divination request; the backend draws a fresh hand
 * and returns a new answer. Tests assert both the answer and the drawn
 * cards are overwritten on a successful retry.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createAnswerOrchestrator } from '../src/core/utils/reading/reading_orchestrator'
import type { AnswerProvider, AnswerRequest } from '../src/core/utils/reading/reading_provider'
import type { DrawnResult, AnswerResult, TarotCardInfo } from '../src/core/api/types'
import type { Divination } from '../src/core/api/divinations'

function makeCard(id: string): TarotCardInfo {
  return {
    id,
    name: id,
    nameEn: id,
    number: 0,
    type: 'major',
    image: `http://localhost/static/${id}.jpeg`,
  }
}

function makeDrawn(id: string): DrawnResult[] {
  return [{ card: makeCard(id), position: 'upright' }]
}

function makeAnswerResult(): AnswerResult {
  return {
    cardDetails: [
      {
        card: makeCard('card_a'),
        position: 'upright',
        answer: {
          quote: 'Action is eloquence.',
          translation: '行动即是雄辩。',
          source: 'William Shakespeare, Coriolanus',
        },
      },
    ],
  }
}

function makeDivination(id = 'card_a', answer: AnswerResult = makeAnswerResult()): Divination {
  return { spreadKind: 'single_card', drawn: makeDrawn(id), answer }
}

function makeMockProvider(divination: Divination | null = null, shouldReject = false): AnswerProvider {
  return {
    type: 'rule_based',
    requestAnswer: vi.fn().mockImplementation(() => {
      if (shouldReject) {
        return Promise.reject(new Error('Test error'))
      }
      return Promise.resolve(divination!)
    }),
    isAvailable: vi.fn().mockReturnValue(true),
  }
}

function makeRequest(): AnswerRequest {
  return { spreadKind: 'single_card' }
}

describe('reading_orchestrator retry', () => {
  let statusRef: ReturnType<typeof ref<'idle' | 'loading' | 'success' | 'error'>>
  let resultRef: ReturnType<typeof ref<AnswerResult | null>>
  let errorRef: ReturnType<typeof ref<string | null>>
  let drawnRef: ReturnType<typeof ref<DrawnResult[]>>

  beforeEach(() => {
    statusRef = ref('idle')
    resultRef = ref(null)
    errorRef = ref(null)
    drawnRef = ref([])
  })

  it('retries with stored request when no request provided', async () => {
    const divination = makeDivination()
    const provider = makeMockProvider(divination)
    const orchestrator = createAnswerOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      drawnRef,
      errorMessage: 'Default error',
    })

    await orchestrator.start(makeRequest())
    expect(provider.requestAnswer).toHaveBeenCalledTimes(1)

    // Simulate error state and clear the result so retry actually re-requests
    // (orchestrator.start short-circuits if resultRef is non-null).
    resultRef.value = null
    statusRef.value = 'error'
    errorRef.value = 'Test error'

    const retryResult = await orchestrator.retry()
    expect(retryResult).toStrictEqual(divination.answer)
    expect(provider.requestAnswer).toHaveBeenCalledTimes(2)
    expect(statusRef.value).toBe('success')
    // After a successful retry, drawnRef must reflect the freshly-drawn hand.
    expect(drawnRef.value).toStrictEqual(divination.drawn)
  })

  it('retries with provided request when given (overwriting drawnRef)', async () => {
    const firstDivination = makeDivination('card_first')
    const secondDivination = makeDivination('card_second')
    const provider: AnswerProvider = {
      type: 'rule_based',
      requestAnswer: vi.fn()
        .mockResolvedValueOnce(firstDivination)
        .mockResolvedValueOnce(secondDivination),
      isAvailable: vi.fn().mockReturnValue(true),
    }
    const orchestrator = createAnswerOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      drawnRef,
      errorMessage: 'Default error',
    })

    await orchestrator.start(makeRequest())
    expect(provider.requestAnswer).toHaveBeenCalledTimes(1)
    expect(drawnRef.value).toStrictEqual(firstDivination.drawn)

    // Clear result so retry re-requests; simulate error path UI state.
    resultRef.value = null
    statusRef.value = 'error'
    errorRef.value = 'Test error'

    const retryResult = await orchestrator.retry({ spreadKind: 'single_card' })
    expect(retryResult).toStrictEqual(secondDivination.answer)
    expect(provider.requestAnswer).toHaveBeenCalledTimes(2)
    // drawnRef must have been overwritten by the retry's fresh draw.
    expect(drawnRef.value).toStrictEqual(secondDivination.drawn)
  })

  it('returns null when retry called without prior start and no request provided', async () => {
    const orchestrator = createAnswerOrchestrator({
      provider: makeMockProvider(),
      statusRef,
      resultRef,
      errorRef,
      drawnRef,
      errorMessage: 'Default error',
    })

    const retryResult = await orchestrator.retry()
    expect(retryResult).toBeNull()
  })

  it('retries from error state and transitions through loading to success', async () => {
    const divination = makeDivination()
    const provider = makeMockProvider(divination)
    const orchestrator = createAnswerOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      drawnRef,
      errorMessage: 'Default error',
    })

    await orchestrator.start(makeRequest())

    // Simulate error and clear cached result so retry re-runs.
    resultRef.value = null
    statusRef.value = 'error'
    errorRef.value = 'Network error'

    expect(orchestrator.state.canRetry).toBe(true)

    const retryPromise = orchestrator.retry()
    expect(statusRef.value).toBe('loading')
    expect(errorRef.value).toBeNull()

    const retryResult = await retryPromise
    expect(retryResult).toStrictEqual(divination.answer)
    expect(statusRef.value).toBe('success')
    expect(orchestrator.state.canRetry).toBe(false)
  })

  it('retries from error state and handles repeated failures', async () => {
    const successDivination = makeDivination('card_success')
    const provider: AnswerProvider = {
      type: 'rule_based',
      requestAnswer: vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce(successDivination),
      isAvailable: vi.fn().mockReturnValue(true),
    }

    const orchestrator = createAnswerOrchestrator({
      provider,
      statusRef,
      resultRef,
      errorRef,
      drawnRef,
      errorMessage: 'Request failed',
    })

    const request = makeRequest()

    // First attempt fails after auto-retry also fails (2 total provider calls).
    const firstResult = await orchestrator.start(request)
    expect(firstResult).toBeNull()
    expect(statusRef.value).toBe('error')
    expect(errorRef.value).toBe('Second failure')
    expect(provider.requestAnswer).toHaveBeenCalledTimes(2)

    // Manual retry succeeds.
    const retryResult = await orchestrator.retry()
    expect(retryResult).toStrictEqual(successDivination.answer)
    expect(statusRef.value).toBe('success')
    expect(errorRef.value).toBeNull()
    expect(provider.requestAnswer).toHaveBeenCalledTimes(3)
    // Successful retry must populate drawnRef.
    expect(drawnRef.value).toStrictEqual(successDivination.drawn)
  })
})
