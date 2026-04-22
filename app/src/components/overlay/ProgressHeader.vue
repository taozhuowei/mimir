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

const props = defineProps<{
  headerStyle: Record<string, string>
  phaseSteps: PhaseStepPresentation[]
  getPhaseStepIconSrc: (step: PhaseStepPresentation) => string
}>()
</script>
