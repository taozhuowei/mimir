<template>
  <!--
    LoadingView — the boot surface, shown by pages/index.vue whenever the
    boot status is non-ok (i.e. while App.vue.bootstrap() loads metadata +
    decodes the critical card-back, AND on a sticky bootstrap failure).
    The orbit motif keeps the wait reading as "cosmic signal"; on failure
    the same surface persists, only an additional top-banner notification
    is pushed (App.vue.bootstrap() → notification store), so the user is
    informed without losing the loading affordance. Mutually exclusive
    with MainSurface (revealed on 'ok').
  -->
  <view class="loading-view" role="region" aria-label="加载中">
    <HeaderArea role="banner">
      <TitleContent variant="loading" />
    </HeaderArea>
    <Stage scene="loading">
      <LoadingOrbits />
    </Stage>
    <NotificationHost />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: flows/loading/components/LoadingView
 * Purpose: boot-loading view. Pure presentation — no business state; the
 *          orbit animation is self-driven (LoadingOrbits owns its GSAP
 *          ticker) and the title copy comes from TitleContent's 'loading'
 *          variant. NotificationHost is mounted locally so error toasts
 *          pushed during the boot phase (the failed branch) are visible
 *          without needing MainSurface to mount.
 * Reason: gives the boot wait a branded animation instead of a blank
 *         idle surface, while bootstrap warms the image cache in parallel;
 *         on a critical failure the same surface stays put and the user
 *         is informed via a non-blocking top notification.
 */
import HeaderArea from '../../base/components/HeaderArea.vue'
import TitleContent from '../../base/components/TitleContent.vue'
import Stage from '../../base/components/Stage.vue'
import NotificationHost from '../../base/components/NotificationHost.vue'
import LoadingOrbits from './LoadingOrbits.vue'
</script>

<style scoped>
.loading-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}
</style>
