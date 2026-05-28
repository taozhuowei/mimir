<template>
  <!--
    ProgressContent — header slot payload for the divination view.
    Renders the 4-phase progress icon row driven by animationController's
    progressHeaderPresentation computed ref.

    Layout responsibility split (task 8.3.1):
      - Outer geometry (margin-top, height, safe-area, z-index) lives on
        HeaderArea. The parent view also applies the GSAP slide-in
        animation via `:style="animCtrl.headerStyle.value"` on the
        HeaderArea element so the entire header band animates together.
      - This component renders ONLY the icon bar.
  -->
  <view class="progress-content__bar">
    <view
      v-for="item in animCtrl.progressHeaderPresentation.value.items"
      :key="item.phase"
      class="progress-content__step"
    >
      <!--
        Stacked dual-image layout (fix: progress icon color-change lag).
        Both the inactive and active asset variants are always present in
        the DOM, so both <image> elements fetch & decode their resources
        at component mount. Phase transitions only flip a CSS class to
        toggle opacity — no late network request, no perceptible delay
        between phase change and color change. Previously the active
        variant (e.g. 113KB pentacles) only began loading when :src was
        swapped, producing a 100–300ms lag where the GSAP grow animation
        had already started before the icon recolored.

        Both elements keep the `.progress-content__step-icon` class so
        existing CSS rules (sizing, compensated modifier) continue to match.
      -->
      <image
        class="progress-content__step-icon progress-content__step-icon--inactive-layer"
        :class="{
          'progress-content__step-icon--compensated': item.isCompensated,
          'progress-content__step-icon--visible': !item.isActive,
        }"
        :src="item.iconSrcInactive"
        mode="aspectFit"
        :alt="`${item.label} 阶段`"
        aria-hidden="true"
      />
      <image
        class="progress-content__step-icon progress-content__step-icon--active-layer"
        :class="{
          'progress-content__step-icon--compensated': item.isCompensated,
          'progress-content__step-icon--visible': item.isActive,
        }"
        :src="item.iconSrcActive"
        mode="aspectFit"
        :alt="`${item.label} 阶段`"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: ProgressContent component
 * Purpose: render the divination view's 4-phase progress icon row inside
 *          the shared HeaderArea shell.
 * Reason: split out from the legacy ProgressArea (task 8.3.1) so the
 *         outer shell can be unified with TitleContent. This component
 *         holds no outer-box geometry — only the icon bar layout.
 * Data flow: animationController (injected from main page) →
 *            progressHeaderPresentation → icon list. The slide-in
 *            entrance animation (animCtrl.headerStyle) is applied by the
 *            parent view to the HeaderArea wrapper, not here.
 */
import { inject } from 'vue'
import type { UseAnimationControllerReturn } from '../composables/use_animation_controller'

const animCtrl = inject<UseAnimationControllerReturn>('animationController')!
</script>

<style scoped>
.progress-content__bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: var(--gap);

  /* Anchor the icon row's top at the same y as TitleContent's first
     text line. Both content types deliberately use the same offset
     (`(var(--header-height) - 44px) / 2`) so the idle ↔ divination
     header swap is baseline-aligned. The shared anchor lives on the
     content components (not HeaderArea) because each content type
     measures its own visible payload differently — HeaderArea stays
     variant-agnostic. */
  margin-top: calc((var(--header-height) - 44px) / 2);
}

.progress-content__step {
  /* `position: relative` anchors the absolutely-positioned stacked icon
     layers below. The flex setup is retained so the wrapper still
     reserves space and centers content for screen-reader bounding-box
     calculations. */
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 2px;
}

.progress-content__step-icon {
  /* Stack both variants on top of each other. Centering via 50%/translate
     keeps the visual position identical to the previous single-icon
     layout regardless of size (40px default vs 44px compensated). */
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
  /* Hidden layer must not capture pointer events or screen-reader focus. */
  pointer-events: none;
}

/* 灰底层：始终可见，作为「未点亮」基线。active 层揭示后会从上面盖住它。 */
.progress-content__step-icon--inactive-layer {
  opacity: 1;
}

/* 彩色层：用 mask 沿 45° 对角线从左下→右上斜向填充揭示（任务 4）。
   起始 mask-position: 100% 0% 把不透明半区推到元素右上外侧，整张图
   完全被透明区遮住；--visible 时 mask-position 滑到 0% 100%，不透明
   半区盖满整张图。260ms ease-out 给出「快速但有曲线」的填充手感。 */
.progress-content__step-icon--active-layer {
  opacity: 1;
  -webkit-mask-image: linear-gradient(45deg, #000 50%, transparent 50%);
          mask-image: linear-gradient(45deg, #000 50%, transparent 50%);
  -webkit-mask-size: 220% 220%;
          mask-size: 220% 220%;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  -webkit-mask-position: 100% 0%;
          mask-position: 100% 0%;
  -webkit-transition: -webkit-mask-position 260ms cubic-bezier(0.22, 1, 0.36, 1);
          transition: mask-position 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.progress-content__step-icon--active-layer.progress-content__step-icon--visible {
  -webkit-mask-position: 0% 100%;
          mask-position: 0% 100%;
  pointer-events: auto;
}

.progress-content__step-icon--compensated {
  width: 44px;
  height: 44px;
}

@media (prefers-reduced-motion: reduce) {
  .progress-content__step-icon--active-layer {
    -webkit-transition: none;
            transition: none;
  }
}
</style>
