/**
 * Name: use_reading_controller
 * Purpose: manage reading lifecycle (start, retry, reset, destroy) and expose reading state.
 * Reason: decouples reading orchestration from animation; reading code never imports gsap.
 */

import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTarotStore } from '../stores/tarot'
import { OfflineReadingProvider } from '../utils/reading/offline_reading_provider'
import { createReadingOrchestrator } from '../utils/reading/reading_orchestrator'
import type { ReadingRequest } from '../utils/reading/reading_provider'
import type { ReadingResult } from '../utils/tarot_reading'
import type { ReadingStatus } from '../utils/reading/reading_orchestrator'
import type { ComputedRef } from 'vue'

export interface UseReadingControllerDeps {
  tarotStore: ReturnType<typeof useTarotStore>
}

export interface UseReadingControllerReturn {
  readingPanelState: ComputedRef<ReadingStatus>
  readingErrorMessage: ComputedRef<string>
  isReadingFailed: ComputedRef<boolean>
  isReadingLoading: ComputedRef<boolean>
  readingResult: ComputedRef<ReadingResult | null>
  startReading: (request: ReadingRequest) => Promise<ReadingResult | null>
  retryReading: (request: ReadingRequest) => Promise<ReadingResult | null>
  resetReading: () => void
  destroyReading: () => void
}

export function useReadingController(deps: UseReadingControllerDeps): UseReadingControllerReturn {
  const readingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { readingResult: storeReadingResult, readingError: storeReadingError } = storeToRefs(deps.tarotStore)

  const readingOrchestrator = createReadingOrchestrator({
    provider: new OfflineReadingProvider(),
    statusRef: readingStatus,
    resultRef: storeReadingResult,
    errorRef: storeReadingError,
    errorMessage: '解读暂时不可用，请稍后重试',
  })

  const readingPanelState = computed(() => readingOrchestrator.state.status)
  const readingErrorMessage = computed(() => readingOrchestrator.state.error || '')
  const isReadingFailed = computed(() => readingOrchestrator.state.status === 'error')
  const isReadingLoading = computed(() => readingOrchestrator.state.status === 'loading')
  const readingResult = computed(() => readingOrchestrator.state.result)

  return {
    readingPanelState,
    readingErrorMessage,
    isReadingFailed,
    isReadingLoading,
    readingResult,
    startReading: (request) => readingOrchestrator.start(request),
    retryReading: (request) => readingOrchestrator.retry(request),
    resetReading: () => readingOrchestrator.reset(),
    destroyReading: () => readingOrchestrator.destroy(),
  }
}
