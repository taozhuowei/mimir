<template>
  <view v-if="isDev" class="dev-tools">
    <view class="dev-tools-header" @click="$emit('toggle-dev-expanded')">
      <text class="dev-tools-title">Dev Tools</text>
      <text class="dev-tools-toggle">{{ isDevExpanded ? '▲' : '▼' }}</text>
    </view>

    <view v-show="isDevExpanded">
      <!-- Phase replay chips -->
      <view class="dev-tools-row">
        <view
          v-for="step in phaseSteps"
          :key="`replay-${step.phase}`"
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          :aria-label="`重播 ${step.label}`"
          @click="$emit('replay', step.phase)"
          @keydown.enter="$emit('replay', step.phase)"
          @keydown.space.prevent="$emit('replay', step.phase)"
        >
          {{ step.label }}
        </view>
      </view>

      <!-- Skip to reading + playback speed chips -->
      <view class="dev-tools-row">
        <view
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          aria-label="跳到解读"
          @click="$emit('skip-to-reading')"
          @keydown.enter="$emit('skip-to-reading')"
          @keydown.space.prevent="$emit('skip-to-reading')"
        >
          直接解读
        </view>
        <view
          v-for="speed in playbackRates"
          :key="`speed-${speed}`"
          class="dev-tools-chip"
          :class="{ active: playbackRate === speed }"
          role="button"
          tabindex="0"
          :aria-label="`播放速度 ${speed}x`"
          @click="$emit('playback-rate', speed)"
          @keydown.enter="$emit('playback-rate', speed)"
          @keydown.space.prevent="$emit('playback-rate', speed)"
        >
          {{ speed }}x
        </view>
      </view>

      <!-- Pause / resume / step controls -->
      <view class="dev-tools-row">
        <view
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          aria-label="暂停"
          @click="$emit('pause')"
          @keydown.enter="$emit('pause')"
          @keydown.space.prevent="$emit('pause')"
        >
          暂停
        </view>
        <view
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          aria-label="继续"
          @click="$emit('resume')"
          @keydown.enter="$emit('resume')"
          @keydown.space.prevent="$emit('resume')"
        >
          继续
        </view>
        <view
          class="dev-tools-chip"
          :class="{ disabled: !isPaused }"
          role="button"
          tabindex="0"
          aria-label="后退一步"
          @click="isPaused && $emit('step-backward')"
          @keydown.enter="isPaused && $emit('step-backward')"
          @keydown.space.prevent="isPaused && $emit('step-backward')"
        >
          ←
        </view>
        <view
          class="dev-tools-chip"
          :class="{ disabled: !isPaused }"
          role="button"
          tabindex="0"
          aria-label="前进一步"
          @click="isPaused && $emit('step-forward')"
          @keydown.enter="isPaused && $emit('step-forward')"
          @keydown.space.prevent="isPaused && $emit('step-forward')"
        >
          →
        </view>
        <text class="dev-tools-status">
          {{ isPaused ? 'Paused' : `Running ${playbackRate}x` }}
        </text>
      </view>

      <!-- Safe frame toggle -->
      <view class="dev-tools-row">
        <view
          class="dev-tools-chip"
          :class="{ active: showSafeFrame }"
          role="button"
          tabindex="0"
          aria-label="显示安全区"
          @click="$emit('toggle-safe-frame')"
          @keydown.enter="$emit('toggle-safe-frame')"
          @keydown.space.prevent="$emit('toggle-safe-frame')"
        >
          安全区
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsPanel
 * Purpose: dev-only panel for phase replay, playback control, and safe-frame overlay toggle.
 * Reason: extracted from DivinationOverlay to reduce component complexity (~920 to ~750 lines).
 * Data flow: receives state via props, sends user actions via emits for the parent to
 *   forward to the overlay controller.
 */
import type { OverlayPhase } from '../../core/flow/types'

const isDev = import.meta.env.DEV
const playbackRates = [0.25, 0.5, 1, 2] as const

defineProps<{
  phaseSteps: { phase: OverlayPhase; label: string }[]
  playbackRate: number
  isPaused: boolean
  isDevExpanded: boolean
  showSafeFrame: boolean
}>()

defineEmits<{
  (e: 'replay', phase: OverlayPhase): void
  (e: 'skip-to-reading'): void
  (e: 'playback-rate', rate: number): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'step-forward'): void
  (e: 'step-backward'): void
  (e: 'toggle-dev-expanded'): void
  (e: 'toggle-safe-frame'): void
}>()
</script>

<style scoped>
.dev-tools {
  position: absolute;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 160rpx);
  z-index: 80;
  width: 420rpx;
  max-width: calc(100vw - 48rpx);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: rgba(247, 240, 224, 1);
  border: 1rpx solid var(--color-border-strong);
  box-shadow: 0 12rpx 36rpx rgba(30, 15, 6, 0.16);
}

.dev-tools-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.dev-tools-title {
  font-size: 22rpx;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.dev-tools-toggle {
  font-size: 18rpx;
  color: var(--color-text-secondary);
  line-height: 1;
}

.dev-tools-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  align-items: center;
}

.dev-tools-chip {
  min-width: 68rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--color-overlay-bg-fade);
  border: 1rpx solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 22rpx;
  line-height: 1.2;
  text-align: center;
}

.dev-tools-chip.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: rgba(184, 148, 62, 0.1);
}

.dev-tools-chip.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.dev-tools-status {
  font-size: 20rpx;
  color: var(--color-text-tertiary);
  margin-left: auto;
}
</style>
