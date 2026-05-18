/**
 * Name: boot status store (Pinia)
 * Purpose: hold the app-bootstrap outcome as an explicit tri-state
 *          (pending → ok | failed) so the route root can pick between the
 *          main divination surface and the fallback view without a second
 *          uni-app route + reLaunch round-trip.
 * Reason: per docs/prd/glossary.md（路由）, the fallback experience is
 *         mutually exclusive with the main surface — that exclusion is a
 *         view-level switch, not a separate route. App.vue's bootstrap()
 *         writes the outcome here once both critical loads settle; the
 *         main page reads it (via use_boot_status) to decide what to mount.
 * Data flow: App.vue.bootstrap() ──▶ markOk()/markFailed() ──▶ status ──▶
 *           useBootStatus().isFailed ──▶ pages/index.vue v-if.
 *
 * `pending` is the launch default: until both loads settle the main
 * surface renders (idle, inert), matching the pre-route-collapse behaviour
 * where the user sat on the main route while bootstrap was in flight.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export type BootStatus = 'pending' | 'ok' | 'failed'

export const useBootStore = defineStore('boot', () => {
  const status = ref<BootStatus>('pending')

  function markOk() {
    status.value = 'ok'
  }

  function markFailed() {
    status.value = 'failed'
  }

  return { status, markOk, markFailed }
})
