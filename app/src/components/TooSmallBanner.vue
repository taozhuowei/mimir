<template>
  <transition name="fade-down">
    <view
      v-if="visible && !dismissed"
      class="too-small-banner"
      role="status"
      aria-live="polite"
    >
      <text class="banner-text">
        当前屏幕尺寸过小（&lt; {{ minWidth }}px），布局可能显示异常。建议使用更大的屏幕或旋转设备。
      </text>
      <view
        class="banner-close"
        role="button"
        tabindex="0"
        aria-label="关闭提示"
        @click="dismiss"
        @keydown.enter="dismiss"
        @keydown.space.prevent="dismiss"
      >
        ×
      </view>
    </view>
  </transition>
</template>

<script setup lang="ts">
/**
 * Top-banner notification shown when the actual viewport width is below
 * the smallest screen the layout is designed for (iPhone 8 / SE 2 at
 * 375 px).
 *
 * Behavior: NON-blocking. The banner sits at the top of the viewport,
 * the rest of the app continues to render below. Users can dismiss it.
 * The intent is to flag potential visual issues without preventing the
 * user from trying — they may rotate or resize and the banner will not
 * reappear in the same session.
 */
import { ref } from 'vue'
import { MIN_VIEWPORT_WIDTH } from '../core/sizing/physical_reservations'

defineProps<{
  /** Whether the actual viewport is below the supported minimum. */
  visible: boolean
}>()

const minWidth = MIN_VIEWPORT_WIDTH

// Dismissal is per-mount; if the user resizes back above min and then
// below again later, we'll re-show. Persisting dismissal across reloads
// would risk hiding a real layout issue silently — better to nudge.
const dismissed = ref(false)
function dismiss() {
  dismissed.value = true
}
</script>

<style scoped>
.too-small-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9000; /* above overlay (z-index 500) but below modal-blocking layers */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  padding-top: calc(10px + env(safe-area-inset-top, 0px));
  background: rgba(184, 148, 62, 0.95);
  color: #1a1e19;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.banner-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.45;
}

.banner-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.12);
  color: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.banner-close:hover {
  background: rgba(0, 0, 0, 0.2);
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
