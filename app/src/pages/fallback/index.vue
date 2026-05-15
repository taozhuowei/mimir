<template>
  <!--
    Fallback page — phase-2.1 skeleton.
    Per PRD §2.2 #2 the fallback route hosts only the FallbackView. The
    main route's startup dispatcher (App.vue's onLaunch) reLaunches here
    when a critical bootstrap resource fails to load.
  -->
  <view class="fallback-page">
    <FallbackView />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: pages/fallback/index
 * Purpose: route root for the fallback experience. Renders the FallbackView
 *          and nothing else (PRD §10.3 #4: no toast, no notification —
 *          the title line is the entire user-facing message).
 * Reason: keeping the fallback page intentionally minimal makes it easy
 *         to reason about the only-fallback-on-fallback rule. No route-
 *         level state, no controllers.
 * Data flow: stateless. The reLaunch decision happens upstream in App.vue.
 */
import FallbackView from '../../shared/views/FallbackView.vue'
</script>

<style scoped>
.fallback-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
