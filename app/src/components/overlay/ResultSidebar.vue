<template>
  <view
    v-if="showResults"
    class="sidebar-container"
    :class="{ 'is-loading': isReadingLoading }"
    role="dialog"
    aria-modal="false"
    aria-label="占卜结果解读"
  >
    <view class="sidebar-content">
      <view class="result-inner">
        <transition name="fade-slide" mode="out-in">
          <!-- Loading -->
          <view v-if="isReadingLoading" key="loading" class="result-loading">
            <view class="loading-spinner"></view>
            <text class="loading-text">{{ overlayText.revealing }}</text>
            <view class="thinking-dots">
              <text class="dot">.</text>
              <text class="dot">.</text>
              <text class="dot">.</text>
            </view>
          </view>

          <!-- Error -->
          <view v-else-if="isReadingFailed" key="error" class="result-error">
            <view class="error-box">
              <text class="error-icon">⚠️</text>
              <text class="error-text">{{ readingErrorMessage }}</text>
            </view>
            <view class="btn btn-primary" @click="emit('retry')">重试读取</view>
          </view>

          <!-- Success -->
          <ResultPanel
            v-else-if="readingResult"
            :key="resultKey"
            :reading-result="readingResult"
            :question="currentQuestion"
            @restart="emit('restart')"
          />
        </transition>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Wide-screen / PC reading column.
 *
 * Renders the divination reading as a static right-side column at the
 * full overlay height. No drag, no height state, no touch handlers — the
 * column is always exactly the same shape (480 × overlay-height) because
 * the screen-mode router (`DivinationOverlay`) only mounts this component
 * when the actual viewport has room for both the phone-sized stage and
 * this column.
 *
 * Pairs with `ResultDrawer.vue`, the narrow-screen sibling. Both wrap the
 * shared `ResultPanel` content but apply very different chrome — that's
 * why we render two components instead of one chooser-by-class.
 */
import { computed } from 'vue'
import ResultPanel from '../ResultPanel.vue'
import type { ReadingResult } from '../../api/types'

const props = defineProps<{
  showResults: boolean
  isReadingLoading: boolean
  isReadingFailed: boolean
  readingErrorMessage: string
  overlayText: { revealing: string }
  readingResult: ReadingResult | null
  currentQuestion: string
}>()

const emit = defineEmits<{
  (event: 'retry'): void
  (event: 'restart'): void
}>()

const resultKey = computed(() => {
  if (!props.readingResult) return 'none'
  return `${props.readingResult.cardDetails[0]?.card.id || 'id'}-${props.readingResult.result}`
})
</script>

<style scoped>
.sidebar-container {
  /* Static right column inside .overlay-main (which is a flex row in PC
     mode). Width is the side-column drawer width owned by the solver
     (DEFAULT_DRAWER_WIDE_WIDTH = 480 px); height fills the overlay-main. */
  flex: 0 0 480px;
  width: 480px;
  height: 100%;
  background: var(--color-bg-page);
  border-left: 1rpx solid var(--color-border);
  /* Establish a named container so the shared ResultPanel can size text
     against this column's width (cqi) instead of the viewport. */
  container: result-drawer / inline-size;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-content {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.result-inner {
  padding: 0 var(--space-5) calc(env(safe-area-inset-bottom, 0px) + var(--space-10));
}

.result-loading {
  height: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.thinking-dots {
  display: flex;
  gap: 8rpx;
}

.dot {
  font-size: 40rpx;
  color: var(--color-accent);
  animation: bounce 1.4s infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.15s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
