<template>
  <!--
    DivinationView: composition per PRD §7.2 #2 — HeaderArea(ProgressContent)
    + Stage(DivinationDeck). Both sub-components are self-driven via
    injected animationController; this view is a pure layout shell with
    no props.

    The header is wrapped in HeaderArea (task 8.3.1) so the slot
    geometry matches IdleView's title header byte-for-byte. The GSAP
    slide-in entrance (animCtrl.headerStyle) is applied to the
    HeaderArea wrapper so the entire header band animates as one unit,
    matching the legacy ProgressArea behaviour.
  -->
  <view class="divination-view">
    <HeaderArea
      role="progressbar"
      :aria-valuetext="progressLabel"
      :style="animCtrl.headerStyle.value"
    >
      <ProgressContent />
    </HeaderArea>
    <Stage scene="divination">
      <DivinationDeck />
    </Stage>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DivinationView
 * Purpose: top-level view for the application's divination phase (PRD §2.3 #2).
 *          Pure layout shell — HeaderArea/ProgressContent and DivinationDeck
 *          are self-driven via injected animationController.
 * Reason: replaces prop-threaded skeleton after phase 2.2.a migrates sub-components
 *         to inject animationController directly. The header chrome
 *         (margin, height, safe-area) lives in HeaderArea after task
 *         8.3.1 so idle and divination headers share one shell.
 * Data flow: no props; animationController provided by main page drives the
 *            progress icons and the header slide-in animation. The
 *            aria-valuetext label is derived from the active step so screen
 *            readers announce the current divination phase.
 */
import { computed, inject } from 'vue'
import HeaderArea from '../components/containers/HeaderArea.vue'
import ProgressContent from '../components/containers/ProgressContent.vue'
import Stage from '../components/containers/Stage.vue'
import DivinationDeck from '../components/stage-content/DivinationDeck.vue'
import type { UseAnimationControllerReturn } from '../composables/use_animation_controller'

const animCtrl = inject<UseAnimationControllerReturn>('animationController')!

/**
 * Active progress phase label (e.g. "审视" / "命定" / ...) surfaced as
 * aria-valuetext on the header so screen readers announce the user's
 * current divination phase. Mirrors the legacy ProgressArea behaviour.
 */
const progressLabel = computed(
  () => animCtrl.progressHeaderPresentation.value.items.find((i) => i.isActive)?.label ?? '',
)
</script>

<style scoped>
.divination-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  /* Uniform safe-area + margin handling shared with IdleView. The CSS
     variable `--margin` is set on the main-page root via the scale
     bridge (pages/main/index.vue), so the same value scales across
     iPhone 8 → 17 Pro Max without per-view subscription. */
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--margin));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--margin));
  padding-left: var(--margin);
  padding-right: var(--margin);
  box-sizing: border-box;
}
</style>
