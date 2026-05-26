/**
 * Name: notification store
 * Purpose: hold the queue of cross-view notifications and expose `push` /
 *          `dismiss` actions for the global notification host.
 * Reason: docs/glossary.md（容器 #9） defines `notification` as a runtime cross-view overlay
 *         container that surfaces all non-blocking errors at the top of the
 *         screen. The actual rendering lives in `NotificationHost.vue`; this
 *         store is the single source of truth for the queue so any caller —
 *         a controller, a fetch wrapper, a pipeline error handler — can push
 *         a message without coupling to view internals.
 * Data flow: producers (controllers / orchestrators) call `push()`; the
 *           NotificationHost consumes the reactive `notifications` ref and
 *           calls `dismiss(id)` when an entry's lifetime ends.
 *
 * Skeleton scope: phase-2.1 only ships the minimal contract so views and
 *                 controllers compile against a stable API. Lifetime / auto-
 *                 dismiss / animation / accessibility wiring lands in 2.2
 *                 together with the actual error-source plumbing.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  /** Unique id used by `dismiss(id)`. */
  id: string
  /** User-facing message text. */
  message: string
  /** Logical severity bucket; styling is decided in 2.2. */
  level?: 'info' | 'warn' | 'error'
}

/**
 * Monotonic id seed. Kept module-local so `push()` never depends on
 * Date.now() (mini-program fake timers in tests can collide).
 */
let nextId = 0

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])

  function push(message: string, level: Notification['level'] = 'info'): string {
    const id = `n${++nextId}`
    notifications.value = [...notifications.value, { id, message, level }]
    return id
  }

  function dismiss(id: string): void {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function clear(): void {
    notifications.value = []
  }

  return {
    notifications,
    push,
    dismiss,
    clear,
  }
})
