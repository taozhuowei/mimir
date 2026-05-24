<template>
  <view class="dev-tools-row">
    <slot />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsRow
 * Purpose: shared flex container for a single dev-tools row — owns the
 *          `.dev-tools-row` layout (wrapping flex with consistent gap).
 * Reason: de-duplicates the identical `.dev-tools-row` style that previously
 *          lived in every dev-tools row component. Pure extraction.
 * Data flow: renders whatever chips / labels the parent slots in.
 */
</script>

<style scoped>
.dev-tools-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  align-items: center;
}
</style>
