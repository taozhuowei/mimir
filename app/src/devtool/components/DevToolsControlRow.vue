<template>
  <!--
    Pause / resume / step controls + status label. Step controls are
    only enabled while the timeline is paused (single-stepping a running
    timeline does not match GSAP semantics).

    Container-borders toggle lives in its own visual row so the dev can
    flip it without scanning past the playback chips.
  -->
  <DevToolsRow>
    <DevToolsChip label="暂停" @activate="$emit('pause')">
      暂停
    </DevToolsChip>
    <DevToolsChip label="继续" @activate="$emit('resume')">
      继续
    </DevToolsChip>
    <DevToolsChip
      :disabled="!isPaused"
      label="后退一步"
      @activate="onStepBackward"
    >
      ←
    </DevToolsChip>
    <DevToolsChip
      :disabled="!isPaused"
      label="前进一步"
      @activate="onStepForward"
    >
      →
    </DevToolsChip>
    <text class="dev-tools-status">
      {{ isPaused ? 'Paused' : `Running ${playbackRate}x` }}
    </text>
  </DevToolsRow>

  <DevToolsRow>
    <DevToolsChip
      :active="showContainerBorders"
      label="显示容器边框"
      @activate="$emit('toggle-container-borders')"
    >
      容器边框
    </DevToolsChip>
  </DevToolsRow>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsControlRow
 * Purpose: render pause/resume/step controls + status label and the
 *          container-borders toggle inside DevToolsPanel.
 * Reason: extracted from DevToolsPanel.vue (P3 nit fix — file was 382
 *          lines, capped at 300). Controlling step gating (`isPaused`)
 *          lives here so the parent does not have to inline the
 *          `isPaused && emit(...)` ceremony for each step button. Chip
 *          markup/styles live in DevToolsChip / DevToolsRow.
 * Data flow: parent passes `isPaused`, `playbackRate`, and
 *          `showContainerBorders`; this row emits `pause`, `resume`,
 *          `step-forward`, `step-backward`, and `toggle-container-borders`.
 */
import DevToolsRow from './DevToolsRow.vue'
import DevToolsChip from './DevToolsChip.vue'

const props = defineProps<{
  isPaused: boolean
  playbackRate: number
  showContainerBorders: boolean
}>()

const emit = defineEmits<{
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'step-forward'): void
  (e: 'step-backward'): void
  (e: 'toggle-container-borders'): void
}>()

// Stepping requires a paused timeline; gating here keeps the chip
// inert (and the visual `.disabled` cue accurate) instead of pushing
// the guard into the parent.
function onStepBackward() {
  if (props.isPaused) emit('step-backward')
}
function onStepForward() {
  if (props.isPaused) emit('step-forward')
}
</script>

<style scoped>
.dev-tools-status {
  font-size: 20rpx;
  color: var(--color-text-tertiary);
  margin-left: auto;
}
</style>
