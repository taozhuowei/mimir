<template>
  <view
    v-if="showResults"
    class="drawer-container"
    :class="{ 'is-wide': isWide, 'is-loading': isReadingLoading }"
  >
    <view
      class="drawer-sheet"
      :style="sheetStyle"
      role="dialog"
      aria-modal="true"
      aria-label="占卜结果解读"
      @touchstart.stop="onDrawerTouchStart"
      @touchmove.stop.prevent="onDrawerTouchMove"
      @touchend.stop="onDrawerTouchEnd"
    >
      <!-- Drag Handle for Mobile (visual + keyboard affordance only — the
           whole sheet captures the drag gesture). -->
      <view
        v-if="!isWide"
        class="drag-handle-zone"
        tabindex="0"
        role="slider"
        aria-label="调整结果面板高度"
        @keydown="onDrawerKeydown"
      >
        <view class="drag-handle-bar"></view>
      </view>

      <!-- Content area is a plain block — internal scrolling is intentionally
           disabled. To read more, drag the entire drawer up. -->
      <view class="drawer-content">
        <view class="result-inner">
          <transition name="fade-slide" mode="out-in">
            <!-- Loading State -->
            <view v-if="isReadingLoading" key="loading" class="result-loading">
              <view class="loading-spinner"></view>
              <text class="loading-text">{{ overlayText.revealing }}</text>
              <view class="thinking-dots">
                <text class="dot">.</text>
                <text class="dot">.</text>
                <text class="dot">.</text>
              </view>
            </view>

            <!-- Error State -->
            <view v-else-if="isReadingFailed" key="error" class="result-error">
              <view class="error-box">
                <text class="error-icon">⚠️</text>
                <text class="error-text">{{ readingErrorMessage }}</text>
              </view>
              <view class="btn btn-primary" @click="emit('retry')">重试读取</view>
            </view>

            <!-- Success State -->
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
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ResultPanel from '../ResultPanel.vue'
import type { ReadingResult } from '../../utils/tarot_reading'

const props = defineProps<{
  showResults: boolean
  isWide: boolean
  isReadingLoading: boolean
  isReadingFailed: boolean
  readingErrorMessage: string
  overlayText: { revealing: string }
  readingResult: ReadingResult | null
  currentQuestion: string
  /** Result-stage card height in px. Used to size the drawer so it covers the
   *  bottom of the spread by `CARD_OVERLAP_PX` and nothing more. */
  cardHeight: number
}>()

const emit = defineEmits<{
  (event: 'retry'): void
  (event: 'restart'): void
}>()

// How far the drawer overlaps the bottom of the cards. Just enough to hint at
// the drawer's existence without obscuring the spread.
const CARD_OVERLAP_PX = 24
// Minimum height when no card information is available (fallback / loading).
const MIN_DRAWER_HEIGHT_PX = 120
// Maximum drawer height as a fraction of the viewport — leaves a thin sliver
// of stage visible so the user can always orient themselves.
const MAX_DRAWER_FRACTION = 0.92

const drawerHeightPx = ref(0)
const isAutoHeight = ref(true)
let drawerStartY = 0
let drawerStartHeight = 0
let isDragging = false

function getMaxHeight(): number {
  const { windowHeight } = uni.getWindowInfo()
  return windowHeight * MAX_DRAWER_FRACTION
}

/**
 * Drawer's resting height when the result phase first appears: the bottom
 * `cardHeight / 2 + windowHeight / 2 - cardCenterY` is occupied by the card,
 * and we want the drawer top to sit `CARD_OVERLAP_PX` below the card's
 * bottom edge. With the stage roughly centred in the viewport, that
 * simplifies to: drawerHeight = windowHeight/2 - cardHeight/2 + overlap.
 */
function getInitialHeight(): number {
  const { windowHeight } = uni.getWindowInfo()
  if (props.cardHeight <= 0) {
    // Fallback when card geometry isn't yet known (e.g. legacy callers).
    return Math.max(MIN_DRAWER_HEIGHT_PX, Math.round(windowHeight * 0.3))
  }
  const target = Math.round(windowHeight / 2 - props.cardHeight / 2 + CARD_OVERLAP_PX)
  return Math.max(MIN_DRAWER_HEIGHT_PX, Math.min(target, getMaxHeight()))
}

watch(() => props.showResults, (newVal) => {
  if (newVal) {
    isAutoHeight.value = false
    drawerHeightPx.value = getInitialHeight()
  } else {
    isAutoHeight.value = true
    drawerHeightPx.value = 0
  }
})

// If the card height becomes available *after* the drawer opened (race
// between layout settle and reveal completion), recompute once.
watch(() => props.cardHeight, (newH) => {
  if (props.showResults && isAutoHeight.value === false && newH > 0) {
    drawerHeightPx.value = getInitialHeight()
  }
})

const sheetStyle = computed(() => {
  if (props.isWide) return ''

  const maxHeight = getMaxHeight()
  const height = isAutoHeight.value
    ? getInitialHeight()
    : Math.max(MIN_DRAWER_HEIGHT_PX, Math.min(drawerHeightPx.value, maxHeight))

  return `height: ${height}px; max-height: ${maxHeight}px`
})

const resultKey = computed(() => {
  if (!props.readingResult) return 'none'
  return `${props.readingResult.cardDetails[0]?.card.id || 'id'}-${props.readingResult.result}`
})

function onDrawerTouchStart(e: TouchEvent) {
  drawerStartY = e.touches[0].clientY
  drawerStartHeight = drawerHeightPx.value || getInitialHeight()
  isDragging = true
  isAutoHeight.value = false
}

function onDrawerTouchMove(e: TouchEvent) {
  if (!isDragging) return
  const deltaY = e.touches[0].clientY - drawerStartY
  let newHeight = drawerStartHeight - deltaY

  const maxHeight = getMaxHeight()
  if (newHeight < MIN_DRAWER_HEIGHT_PX) newHeight = MIN_DRAWER_HEIGHT_PX
  if (newHeight > maxHeight) newHeight = maxHeight

  drawerHeightPx.value = newHeight
}

function onDrawerTouchEnd() {
  isDragging = false
  // Snap to limits if close.
  const maxHeight = getMaxHeight()
  if (drawerHeightPx.value > maxHeight - 30) drawerHeightPx.value = maxHeight
  if (drawerHeightPx.value < MIN_DRAWER_HEIGHT_PX + 30) drawerHeightPx.value = MIN_DRAWER_HEIGHT_PX
}

function onDrawerKeydown(e: KeyboardEvent) {
  const step = 40
  const maxHeight = getMaxHeight()

  if (isAutoHeight.value) {
    isAutoHeight.value = false
    drawerHeightPx.value = getInitialHeight()
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    drawerHeightPx.value = Math.min(maxHeight, drawerHeightPx.value + step)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    drawerHeightPx.value = Math.max(MIN_DRAWER_HEIGHT_PX, drawerHeightPx.value - step)
  }
}
</script>

<style scoped>
.drawer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  pointer-events: none;
}

.drawer-sheet {
  width: 100%;
  max-width: 800px;
  background: var(--color-bg-page);
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border: 1rpx solid var(--color-border);
  margin: 0 auto;
  /* Establish a named container so descendants can size text against the
     drawer's actual inline width (cqi) instead of the viewport. On wide
     layouts the drawer is only 46% of the viewport, so viewport-based
     clamps misjudged the readable column. */
  container: result-drawer / inline-size;
  /* The whole sheet captures the drag gesture; touch-action stops the
     browser from competing with our handlers (e.g. pull-to-refresh). */
  touch-action: none;
}

.is-wide .drawer-container {
  justify-content: flex-end;
  align-items: flex-end;
}

.is-wide .drawer-sheet {
  height: 100% !important;
  max-height: 100% !important;
  width: 46%;
  max-width: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-left: 1rpx solid var(--color-border);
  border-top: none;
  margin: 0;
  transition: none;
  /* Wide layout uses a static side panel — no drag gesture, restore
     normal touch behaviour so any future scrollable child works. */
  touch-action: auto;
}

.drag-handle-zone {
  height: 64rpx;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ns-resize;
  flex-shrink: 0;
}

.drag-handle-bar {
  width: 80rpx;
  height: 8rpx;
  background: var(--color-border-focus);
  border-radius: 4rpx;
  opacity: 0.5;
}

.drawer-content {
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
