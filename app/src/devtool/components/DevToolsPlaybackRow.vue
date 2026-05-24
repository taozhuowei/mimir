<template>
  <!--
    Skip + playback-rate chips. The skip chip jumps directly to the
    answer phase; the rate chips set the global playback rate (active
    state shows the currently-applied multiplier).
  -->
  <DevToolsRow>
    <DevToolsChip
      label="跳到解读"
      @activate="$emit('skip-to-answer')"
    >
      直接解读
    </DevToolsChip>
    <DevToolsChip
      v-for="speed in playbackRates"
      :key="`speed-${speed}`"
      :active="playbackRate === speed"
      :label="`播放速度 ${speed}x`"
      @activate="$emit('playback-rate', speed)"
    >
      {{ speed }}x
    </DevToolsChip>
  </DevToolsRow>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsPlaybackRow
 * Purpose: render the skip-to-answer + playback-rate chips inside
 *          DevToolsPanel.
 * Reason: extracted from DevToolsPanel.vue (P3 nit fix — file was 382
 *          lines, capped at 300). The list of supported rates lives here
 *          since it is private to this row's UI affordance — adding a new
 *          rate is a one-file change. Chip markup/styles live in
 *          DevToolsChip / DevToolsRow.
 * Data flow: parent owns the current `playbackRate`; this row emits
 *          `playback-rate` and `skip-to-answer`.
 */
import DevToolsRow from './DevToolsRow.vue'
import DevToolsChip from './DevToolsChip.vue'

defineProps<{
  playbackRate: number
}>()

defineEmits<{
  (e: 'skip-to-answer'): void
  (e: 'playback-rate', rate: number): void
}>()

// Locally-owned: which rates the panel offers as one-tap presets.
// Keep aligned with the parent's outbound emit signature (number).
const playbackRates = [0.25, 0.5, 1, 2] as const
</script>
