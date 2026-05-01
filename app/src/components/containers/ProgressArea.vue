<template>
  <view
    class="progress-area"
    role="progressbar"
    :aria-valuetext="animCtrl.progressHeaderPresentation.value.items.find(i => i.isActive)?.label ?? ''"
    :style="animCtrl.headerStyle.value"
  >
    <view class="progress-area__bar">
      <view
        v-for="item in animCtrl.progressHeaderPresentation.value.items"
        :key="item.phase"
        class="progress-area__step"
      >
        <image
          class="progress-area__step-icon"
          :class="{ 'progress-area__step-icon--compensated': item.isCompensated }"
          :src="item.iconSrc"
          mode="aspectFit"
          :alt="`${item.label} 阶段`"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: ProgressArea container
 * Purpose: divination view top-anchored progress bar — 4 phase icons driven by
 *          animationController's progressHeaderPresentation computed ref.
 * Reason: migrated from ProgressHeader.vue in phase 2.2.a. Self-contained via
 *         inject; headerStyle wires the GSAP entry animation.
 * Data flow: animationController (injected from main page) → progressHeaderPresentation
 *            → icon list. headerStyle drives GSAP slide-in animation.
 */
import { inject } from 'vue'
import type { UseAnimationControllerReturn } from '../../composables/use_animation_controller'

const animCtrl = inject<UseAnimationControllerReturn>('animationController')!
</script>

<style scoped>
.progress-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 20;
  padding: 24rpx 0;
}

/* #ifdef H5 */
.progress-area {
  margin-top: calc(env(safe-area-inset-top, 0px) + 60rpx);
}
/* #endif */

/* #ifdef MP-WEIXIN */
.progress-area {
  margin-top: calc(env(safe-area-inset-top, 0px) + 140rpx);
}
/* #endif */

.progress-area__bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.progress-area__step {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 2px;
}

.progress-area__step-icon {
  width: 40px;
  height: 40px;
  transition: opacity 0.2s ease;
}

.progress-area__step-icon--compensated {
  width: 44px;
  height: 44px;
}
</style>
