<template>
  <!--
    Phase replay chips. Each chip jumps the overlay back to the entry
    state of a specific phase. Phase order is owned by the parent (it
    receives the canonical list from the registry); this row just renders.
  -->
  <DevToolsRow>
    <DevToolsChip
      v-for="step in phaseSteps"
      :key="`replay-${step.phase}`"
      :label="`重播 ${step.label}`"
      @activate="$emit('replay', step.phase)"
    >
      {{ step.label }}
    </DevToolsChip>
  </DevToolsRow>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsPhaseRow
 * Purpose: render the row of phase-replay chips inside DevToolsPanel.
 * Reason: extracted from DevToolsPanel.vue (P3 nit fix — file was 382
 *          lines, capped at 300). Each row is now its own SFC so the
 *          parent template stays under cap and individual rows can evolve
 *          independently (a new phase added to the registry only touches
 *          this file). Chip markup/styles live in DevToolsChip / DevToolsRow.
 * Data flow: parent passes the manifest; this component emits `replay`
 *          with the chosen phase, which the parent forwards to the
 *          overlay controller.
 */
import type { OverlayPhase } from '../../flows/base/composables/animations/phase_contracts'
import DevToolsRow from './DevToolsRow.vue'
import DevToolsChip from './DevToolsChip.vue'

defineProps<{
  phaseSteps: { phase: OverlayPhase; label: string }[]
}>()

defineEmits<{
  (e: 'replay', phase: OverlayPhase): void
}>()
</script>
