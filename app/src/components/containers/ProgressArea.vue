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
 *         inject; headerStyle wires the GSAP entry animation. Sizing comes
 *         from the proportional scale system via CSS custom properties bound
 *         on `pages/main/index.vue`'s root — this component does NOT
 *         subscribe to `useResponsiveScale` directly, so the idle and
 *         divination header slots line up to the same `var(--header-height)`.
 * Data flow: animationController (injected from main page) → progressHeaderPresentation
 *            → icon list. headerStyle drives GSAP slide-in animation.
 */
import { inject } from 'vue'
import type { UseAnimationControllerReturn } from '../../composables/use_animation_controller'

const animCtrl = inject<UseAnimationControllerReturn>('animationController')!
</script>

<style scoped>
.progress-area {
  height: var(--header-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.progress-area__bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
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
