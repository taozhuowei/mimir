/**
 * Name: boot status store (Pinia)
 * Purpose: hold the app-bootstrap outcome as an explicit tri-state
 *          (pending → ok | failed) so the route root can pick between the
 *          main divination surface (ok) and the LoadingView (anything
 *          else — pending OR failed) without a second uni-app route +
 *          reLaunch round-trip.
 * Reason: per docs/glossary.md（路由）, the boot-loading and boot-failure
 *         experiences are mutually exclusive with the main surface — that
 *         exclusion is a view-level switch, not a separate route. There
 *         is no separate fallback view: a failure pins the LoadingView
 *         and is surfaced via a top-banner notification (App.vue pushes
 *         it on markFailed()). App.vue's bootstrap() writes the outcome
 *         here once both critical loads settle; pages/index.vue reads it
 *         (via use_boot_status) to decide what to mount.
 * Data flow: App.vue.bootstrap() ──▶ markOk()/markFailed() ──▶ status ──▶
 *           useBootStatus() ──▶ pages/index.vue v-if.
 *
 * `pending` is the launch default: until both loads settle the LoadingView
 * renders the orbit motif while bootstrap is in flight; on a critical
 * failure the same view stays put and the notification carries the detail.
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
