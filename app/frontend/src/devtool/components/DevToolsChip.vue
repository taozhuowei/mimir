<template>
  <view
    class="dev-tools-chip"
    :class="{ active, disabled }"
    role="button"
    tabindex="0"
    :aria-label="label"
    @click="$emit('activate')"
    @keydown.enter="$emit('activate')"
    @keydown.space.prevent="$emit('activate')"
  >
    <slot />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsChip
 * Purpose: shared pill-button used across every dev-tools row — owns the chip
 *          markup (role/tabindex/aria-label + click + Enter/Space activation)
 *          and its styling, including the `active` / `disabled` visual states.
 * Reason: de-duplicates the identical chip markup and `.dev-tools-chip` styles
 *          that previously lived in DevToolsPhaseRow / DevToolsPlaybackRow /
 *          DevToolsControlRow. Pure extraction — no behavioural change.
 * Data flow: parent supplies the label (default slot) + active/disabled/ariaLabel;
 *          this component emits `activate` for click and keyboard (Enter/Space).
 *          `disabled` only drives the visual state (and pointer-events); the
 *          parent still owns any guard logic, exactly as before.
 */
withDefaults(defineProps<{
  active?: boolean
  disabled?: boolean
  /** Accessible label — rendered as `aria-label` on the chip button. */
  label: string
}>(), {
  active: false,
  disabled: false,
})

defineEmits<{
  (e: 'activate'): void
}>()
</script>

<style scoped>
.dev-tools-chip {
  min-width: 68rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--color-overlay-bg-fade);
  border: 1rpx solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 22rpx;
  line-height: 1.2;
  text-align: center;
}

.dev-tools-chip.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: rgba(184, 148, 62, 0.1);
}

.dev-tools-chip.disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
