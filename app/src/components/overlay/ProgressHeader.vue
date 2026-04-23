<template>
  <view class="progress-header" :style="headerStyle">
    <view class="phase-progress-bar">
      <view
        v-for="(step, idx) in phaseSteps"
        :key="step.phase"
        class="phase-step"
      >
        <image
          class="phase-step-icon"
          :class="{ 'phase-step-icon-compensated': idx < 2 }"
          :src="getPhaseStepIconSrc(step)"
          mode="aspectFit"
          :alt="`${step.phase} 阶段`"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { OverlayPhase } from '../../core/flow/types'

interface PhaseStepPresentation {
  phase: OverlayPhase
  isActive: boolean
  isCompleted: boolean
}

defineProps<{
  headerStyle: Record<string, string>
  phaseSteps: PhaseStepPresentation[]
  getPhaseStepIconSrc: (step: PhaseStepPresentation) => string
}>()
</script>

<style scoped>
.progress-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 20;
}

/* #ifdef H5 */
.progress-header {
  margin-top: calc(env(safe-area-inset-top, 0px) + 60rpx);
}
/* #endif */

/* #ifdef MP-WEIXIN */
.progress-header {
  margin-top: calc(env(safe-area-inset-top, 0px) + 140rpx);
}
/* #endif */

.phase-progress-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.phase-step {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 2px;
}

.phase-step-icon {
  width: 40px;
  height: 40px;
  transition: opacity 0.2s ease;
}

.phase-step-icon-compensated {
  width: 44px;
  height: 44px;
}
</style>
