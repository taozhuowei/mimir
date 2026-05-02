<template>
  <!--
    DivinationView: composition per PRD §7.2 #2 — ProgressArea + Stage(DivinationDeck).
    Both sub-components are self-driven via injected animationController;
    this view is a pure layout shell with no props.
  -->
  <view class="divination-view">
    <ProgressArea />
    <Stage scene="divination">
      <DivinationDeck />
    </Stage>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DivinationView
 * Purpose: top-level view for the application's divination phase (PRD §2.3 #2).
 *          Pure layout shell — ProgressArea and DivinationDeck are self-driven
 *          via injected animationController.
 * Reason: replaces prop-threaded skeleton after phase 2.2.a migrates sub-components
 *         to inject animationController directly.
 * Data flow: no props; animationController provided by main page drives both children.
 */
import ProgressArea from '../components/containers/ProgressArea.vue'
import Stage from '../components/containers/Stage.vue'
import DivinationDeck from '../components/stage-content/DivinationDeck.vue'
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
