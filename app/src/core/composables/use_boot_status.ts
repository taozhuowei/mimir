/**
 * Name: core/composables/use_boot_status
 * Purpose: the seam between the boot store and its two consumers — App.vue
 *          (writer: marks the outcome after bootstrap settles) and
 *          pages/index.vue (reader: picks fallback vs main surface).
 * Reason: mirrors use_app_phase — views/route roots consume a composable,
 *         not the store directly, so the source can be refactored without
 *         touching call sites.
 * Data flow: useBootStore().status ──▶ isFailed ──▶ route-root v-if;
 *           markOk()/markFailed() ──▶ store status.
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBootStore } from '../store/boot'

export interface UseBootStatusReturn {
  /** Reactive bootstrap outcome: 'pending' | 'ok' | 'failed'. */
  status: ReturnType<typeof storeToRefs<ReturnType<typeof useBootStore>>>['status']
  /** True only once bootstrap has settled with a critical failure. */
  isFailed: ReturnType<typeof computed<boolean>>
  /** Bootstrap settled successfully — render the main surface. */
  markOk: () => void
  /** A critical bootstrap resource failed — render the fallback view. */
  markFailed: () => void
}

export function useBootStatus(): UseBootStatusReturn {
  const bootStore = useBootStore()
  const { status } = storeToRefs(bootStore)

  return {
    status,
    isFailed: computed(() => status.value === 'failed'),
    markOk: () => bootStore.markOk(),
    markFailed: () => bootStore.markFailed(),
  }
}
