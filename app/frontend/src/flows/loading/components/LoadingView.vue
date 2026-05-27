<template>
  <!--
    LoadingView — the boot-loading surface, shown while App.vue.bootstrap()
    loads metadata + decodes the critical card-back in parallel (pages/index.vue
    renders it for boot status 'pending'). It reuses the fallback orbit motif
    (FallbackOrbits) so the wait reads as the same "cosmic signal" language as
    the failure view, with a loading title instead of the error line. Mutually
    exclusive with MainSurface (revealed on 'ok') and FallbackView (on 'failed').
  -->
  <view class="loading-view" role="region" aria-label="加载中">
    <HeaderArea role="banner">
      <TitleContent variant="loading" />
    </HeaderArea>
    <Stage scene="loading">
      <FallbackOrbits />
    </Stage>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: flows/loading/components/LoadingView
 * Purpose: boot-loading view. Pure presentation — no business state; the
 *          orbit animation is self-driven (FallbackOrbits owns its GSAP
 *          ticker) and the title copy comes from TitleContent's 'loading'
 *          variant.
 * Reason: gives the boot wait a branded animation (reusing the fallback
 *          orbits) instead of a blank idle surface, while bootstrap warms
 *          the image cache in parallel.
 */
import HeaderArea from '../../base/components/HeaderArea.vue'
import TitleContent from '../../base/components/TitleContent.vue'
import Stage from '../../base/components/Stage.vue'
import FallbackOrbits from '../../fallback/components/FallbackOrbits.vue'
</script>

<style scoped>
.loading-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}
</style>
