<template>
  <!--
    NotificationHost — phase-2.1 placeholder.
    Renders the cross-view notification stack defined in docs/glossary.md（容器 #9）. Real
    styling, lifecycle, and dismiss behaviour land in 2.2; for now the host
    just enumerates the queue so the wiring is visible.
  -->
  <view
    class="notification-host"
    role="region"
    aria-label="通知"
    aria-live="polite"
  >
    <view
      v-for="n in notificationStore.notifications"
      :key="n.id"
      class="notification-host__item"
      :class="`notification-host__item--${n.level ?? 'info'}`"
      role="status"
    >
      <text class="notification-host__message">{{ n.message }}</text>
      <view
        class="notification-host__dismiss"
        role="button"
        tabindex="0"
        aria-label="关闭通知"
        @click="notificationStore.dismiss(n.id)"
        @keydown.enter="notificationStore.dismiss(n.id)"
        @keydown.space.prevent="notificationStore.dismiss(n.id)"
      >×</view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: NotificationHost
 * Purpose: subscribe to the notification store and render the queue at the
 *          surface root, above the hosting view.
 * Reason: docs/glossary.md（容器 #9） mandates a cross-view error overlay. The
 *         host is mounted once inside MainSurface (covers idle / divination
 *         / answer flows) and once inside LoadingView (covers the boot
 *         pending + boot-failed states, since MainSurface never mounts on
 *         failure). The two instances are mutually exclusive — pages/index
 *         renders exactly one host-bearing view at a time — so they never
 *         stack. Failure detail toasts pushed by App.vue.bootstrap() appear
 *         on the LoadingView via this same component
 *         (docs/animation.md（动效规范 #4）).
 * Data flow: producers call `useNotificationStore().push()`; this host
 *           reads `notifications` reactively and calls `dismiss(id)` from
 *           the placeholder close affordance.
 */
import { useNotificationStore } from '../../../core/store/notification'

const notificationStore = useNotificationStore()
</script>

<style scoped>
.notification-host {
  position: fixed;
  top: env(safe-area-inset-top, 0px);
  left: 0;
  right: 0;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  pointer-events: none;
}

.notification-host__item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  font-size: var(--font-xs);
  color: var(--color-text-primary);
}

.notification-host__dismiss {
  font-size: var(--font-s);
  color: var(--color-text-tertiary);
  cursor: pointer;
}
</style>
