<template>
  <view class="action-bar">
    <template v-if="showResults">
      <view
        class="btn btn-secondary"
        role="button"
        tabindex="0"
        aria-label="回到首页"
        @click="emit('backHome')"
        @keydown.enter="emit('backHome')"
        @keydown.space.prevent="emit('backHome')"
      >{{ overlayText.backHome }}</view>
      <view
        class="btn btn-primary"
        role="button"
        tabindex="0"
        aria-label="再占一次"
        @click="emit('restart')"
        @keydown.enter="emit('restart')"
        @keydown.space.prevent="emit('restart')"
      >{{ overlayText.restart }}</view>
    </template>

    <template v-else-if="phase === 'revealing'">
      <view class="revealing-hint font-display">
        {{ overlayText.revealing }}
        <view class="thinking-dots">
          <text class="dot dot-1">.</text>
          <text class="dot dot-2">.</text>
          <text class="dot dot-3">.</text>
        </view>
      </view>
    </template>

    <template v-else-if="isReadingFailed">
      <view
        class="btn btn-primary"
        role="button"
        tabindex="0"
        aria-label="重试"
        @click="emit('retry')"
        @keydown.enter="emit('retry')"
        @keydown.space.prevent="emit('retry')"
      >{{ '重试' }}</view>
    </template>
  </view>
</template>

<script setup lang="ts">
import type { OverlayPhase } from '../../core/flow/types'

const props = defineProps<{
  showResults: boolean
  phase: OverlayPhase
  isReadingFailed: boolean
  overlayText: { backHome: string; restart: string; revealing: string }
}>()

const emit = defineEmits<{
  (event: 'backHome'): void
  (event: 'restart'): void
  (event: 'retry'): void
}>()
</script>
