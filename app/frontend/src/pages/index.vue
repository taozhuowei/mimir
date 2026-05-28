<template>
  <!--
    Boot shell — the app's single uni-app route (docs/glossary.md（路由）).
    Bootstrap outcome (App.vue → boot store) decides which mutually-
    exclusive surface mounts: status 'ok' → MainSurface; everything else
    (pending bootstrap OR a critical failure) → LoadingView. There is no
    separate fallback view: a failure pins the loading surface, and a
    non-blocking top-banner notification (pushed by App.vue.bootstrap()
    on failure) tells the user the cosmic signal is weak. Recovery would
    still be reactive (status flips back to 'ok' → MainSurface mounts).
    The non-ok branch carries the full-viewport flex column wrapper; the
    LoadingView is flex:1. MainSurface owns its own root.
  -->
  <view v-if="!isOk" class="boot-route">
    <LoadingView />
  </view>
  <MainSurface v-else />
</template>

<script setup lang="ts">
/**
 * Name: pages/index
 * Purpose: the route root. A pure boot shell: reads the bootstrap outcome
 *          via useBootStatus and renders the LoadingView whenever the
 *          status is not 'ok' (covers both the bootstrap wait and the
 *          sticky-failed state), otherwise the MainSurface. No
 *          orchestration lives here — useMainStage is constructed inside
 *          MainSurface, so it is never instantiated in the non-ok state.
 * Data flow: useBootStatus().status (← boot store ← App.vue.bootstrap)
 *           ──▶ isOk ──▶ v-if branch.
 */
import { computed } from 'vue'
import LoadingView from '../flows/loading/components/LoadingView.vue'
import MainSurface from '../flows/base/components/MainSurface.vue'
import { useBootStatus } from '../flows/base/composables/use_boot_status'

const { status } = useBootStatus()

/** Bootstrap succeeded — the only state that reveals the main surface. */
const isOk = computed(() => status.value === 'ok')
</script>

<style scoped>
/* Full-viewport flex-column shell for the non-main boot route (loading);
   the hosted view is itself flex:1. */
.boot-route {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
