<template>
  <!--
    Boot shell — the app's single uni-app route (docs/glossary.md（路由）).
    Bootstrap outcome (App.vue → boot store) decides which mutually-
    exclusive surface mounts: a critical-failure → the FallbackView; pending
    (bootstrap in flight) → the LoadingView; success → the MainSurface. There
    is no second route + reLaunch — the switch is view-level, and recovery is
    reactive (status flips back to a non-failed value → the matching surface
    re-mounts automatically). The fallback / loading branches carry the
    full-viewport flex column wrapper (each view is flex:1); MainSurface owns
    its own root.
  -->
  <view v-if="isFailed" class="boot-route">
    <FallbackView />
  </view>
  <view v-else-if="isBooting" class="boot-route">
    <LoadingView />
  </view>
  <MainSurface v-else />
</template>

<script setup lang="ts">
/**
 * Name: pages/index
 * Purpose: the route root. A pure boot shell: reads the bootstrap outcome
 *          via useBootStatus and renders the FallbackView on a critical
 *          failure, otherwise the MainSurface. No orchestration lives here
 *          — useMainStage is constructed inside MainSurface, so it is never
 *          instantiated in the failed state.
 * Data flow: useBootStatus().status (← boot store ← App.vue.bootstrap)
 *           ──▶ isFailed / isBooting ──▶ v-if branch.
 */
import { computed } from 'vue'
import FallbackView from '../flows/fallback/components/FallbackView.vue'
import LoadingView from '../flows/loading/components/LoadingView.vue'
import MainSurface from '../flows/base/components/MainSurface.vue'
import { useBootStatus } from '../flows/base/composables/use_boot_status'

const { status, isFailed } = useBootStatus()

/** Bootstrap still in flight — show the loading view, not a blank surface. */
const isBooting = computed(() => status.value === 'pending')
</script>

<style scoped>
/* Shared full-viewport flex-column shell for the non-main boot routes
   (fallback + loading); each hosted view is itself flex:1. */
.boot-route {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
