<template>
  <scroll-view
    v-if="showResults"
    class="result-zone"
    :style="!isWide ? `height: ${resultSheetHeight}vh;` : ''"
    scroll-y
    enable-flex
  >
    <view v-if="!isWide" class="drag-handle-container" @touchstart.stop="onDrawerTouchStart" @touchmove.stop.prevent="onDrawerTouchMove">
      <view class="drag-handle"></view>
    </view>
    <view class="result-zone-inner">
      <view v-if="isReadingLoading" class="result-loading">
        <view class="loading-row">
          <view class="loading-spinner"></view>
          <text class="loading-text">{{ overlayText.revealing }}</text>
        </view>
        <view class="thinking-dots">
          <text class="dot dot-1">.</text>
          <text class="dot dot-2">.</text>
          <text class="dot dot-3">.</text>
        </view>
      </view>

      <view v-else-if="isReadingFailed" class="result-error">
        <view class="error-box">
          <text class="error-icon">⚠️</text>
          <text class="error-text">{{ readingErrorMessage }}</text>
        </view>
        <view class="btn btn-primary" @click="emit('retry')">{{ '重试' }}</view>
      </view>

      <ResultPanel
        v-else-if="readingResult"
        :reading-result="readingResult"
        :question="currentQuestion"
        @restart="emit('restart')"
      />
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ResultPanel from '../ResultPanel.vue'
import type { ReadingResult } from '../../utils/tarotReading'

const props = defineProps<{
  showResults: boolean
  isWide: boolean
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

const resultSheetHeight = ref(58)
let drawerStartY = 0
let drawerStartHeight = 58

function onDrawerTouchStart(e: TouchEvent) {
  drawerStartY = e.touches[0].clientY
  drawerStartHeight = resultSheetHeight.value
}

function onDrawerTouchMove(e: TouchEvent) {
  const deltaY = e.touches[0].clientY - drawerStartY
  const { windowHeight } = uni.getWindowInfo()
  const vhDelta = -(deltaY / windowHeight) * 100
  let newHeight = drawerStartHeight + vhDelta
  if (newHeight < 30) newHeight = 30
  if (newHeight > 92) newHeight = 92
  resultSheetHeight.value = newHeight
}
</script>
