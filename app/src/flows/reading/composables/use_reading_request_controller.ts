/**
 * Name: flows/reading/composables/use_reading_request_controller
 * Purpose: manage divination lifecycle (start, retry, reset, destroy) and
 *          expose request state to the overlay templates.
 * Reason: decouples divination orchestration from animation; this module
 *         never imports gsap. Drawn cards land in the tarot store via the
 *         orchestrator's `drawnRef`, so animation code reads them directly.
 */

import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTarotStore } from '../../../core/store/tarot'
import { RuleBasedAnswerProvider } from '../../../core/utils/reading/rule_based_reading_provider'
import { createAnswerOrchestrator } from '../../../core/utils/reading/reading_orchestrator'
import type { AnswerRequest } from '../../../core/utils/reading/reading_provider'
import type { AnswerResult } from '../../../core/api/types'
import type { AnswerStatus } from '../../../core/utils/reading/reading_orchestrator'
import type { ComputedRef } from 'vue'

export interface UseAnswerControllerDeps {
  tarotStore: ReturnType<typeof useTarotStore>
}

export interface UseAnswerControllerReturn {
  answerPanelState: ComputedRef<AnswerStatus>
  answerErrorMessage: ComputedRef<string>
  isAnswerFailed: ComputedRef<boolean>
  isAnswerLoading: ComputedRef<boolean>
  answerResult: ComputedRef<AnswerResult | null>
  startAnswer: (request: AnswerRequest) => Promise<AnswerResult | null>
  retryAnswer: (request: AnswerRequest) => Promise<AnswerResult | null>
  resetAnswer: () => void
  destroyAnswer: () => void
}

export function useAnswerController(deps: UseAnswerControllerDeps): UseAnswerControllerReturn {
  const readingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const {
    answerResult: storeAnswerResult,
    answerError: storeAnswerError,
    drawnCards: storeDrawnCards,
  } = storeToRefs(deps.tarotStore)

  const readingOrchestrator = createAnswerOrchestrator({
    provider: new RuleBasedAnswerProvider(),
    statusRef: readingStatus,
    resultRef: storeAnswerResult,
    errorRef: storeAnswerError,
    drawnRef: storeDrawnCards,
    errorMessage: '答案暂时不可用，请稍后重试',
  })

  const answerPanelState = computed(() => readingOrchestrator.state.status)
  const answerErrorMessage = computed(() => readingOrchestrator.state.error || '')
  const isAnswerFailed = computed(() => readingOrchestrator.state.status === 'error')
  const isAnswerLoading = computed(() => readingOrchestrator.state.status === 'loading')
  const answerResult = computed(() => readingOrchestrator.state.result)

  return {
    answerPanelState,
    answerErrorMessage,
    isAnswerFailed,
    isAnswerLoading,
    answerResult,
    startAnswer: (request) => readingOrchestrator.start(request),
    retryAnswer: (request) => readingOrchestrator.retry(request),
    resetAnswer: () => readingOrchestrator.reset(),
    destroyAnswer: () => readingOrchestrator.destroy(),
  }
}
