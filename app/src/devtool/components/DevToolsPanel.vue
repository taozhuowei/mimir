<template>
  <view
    v-if="isDev"
    class="dev-tools"
    :class="{ 'dev-tools--collapsed': !isDevExpanded, 'dev-tools--dragging': isDragging }"
    :style="containerStyle"
  >
    <!-- Drag handle / collapsed-state toggle. The same surface acts as
         both a drag handle and an expand/collapse button: pressing then
         moving is a drag (controller swallows the trailing click);
         pressing then releasing in place toggles the panel. -->
    <view
      class="dev-tools-handle"
      role="button"
      tabindex="0"
      :aria-label="isDevExpanded ? '收起开发工具' : '展开开发工具'"
      :aria-expanded="isDevExpanded"
      @mousedown="onMouseDown"
      @touchstart.passive="onTouchStart"
      @click="onHandleClick"
      @keydown.enter="$emit('toggle-dev-expanded')"
      @keydown.space.prevent="$emit('toggle-dev-expanded')"
    >
      <DevToolsCollapsedIcon v-if="!isDevExpanded" />
      <template v-else>
        <text class="dev-tools-title">Dev Tools</text>
        <text class="dev-tools-toggle" aria-hidden="true">▲</text>
      </template>
    </view>

    <view v-show="isDevExpanded" class="dev-tools-body">
      <DevToolsPhaseRow :phase-steps="phaseSteps" @replay="(p) => $emit('replay', p)" />
      <DevToolsPlaybackRow
        :playback-rate="playbackRate"
        @skip-to-answer="$emit('skip-to-answer')"
        @playback-rate="(r) => $emit('playback-rate', r)"
      />
      <DevToolsControlRow
        :is-paused="isPaused"
        :playback-rate="playbackRate"
        :show-container-borders="showContainerBorders"
        @pause="$emit('pause')"
        @resume="$emit('resume')"
        @step-forward="$emit('step-forward')"
        @step-backward="$emit('step-backward')"
        @toggle-container-borders="$emit('toggle-container-borders')"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsPanel
 * Purpose: dev-only floating panel for phase replay, playback control, and
 *          safe-frame overlay toggle. Hosts the draggable shell + folded /
 *          expanded states; delegates the actual control rows to row-level
 *          sub-components.
 * Reason: extracted from DivinationOverlay to reduce component complexity.
 *   Per requirement N1 the collapsed state is a 40 px circular handle the
 *   developer can drag to any corner of the screen — handy when the panel
 *   obscures whatever they're currently inspecting. Position is intentionally
 *   NOT persisted: refresh resets to the bottom-right default so a stuck
 *   off-screen panel always recovers naturally.
 *   P3 nit fix: the four template rows (phase replay, playback chips,
 *   control chips, container-borders toggle) were extracted into row-level
 *   sub-components so this shell stays under the 300-line file cap. The
 *   public props/emits are unchanged so callers (DivinationOverlay) need
 *   no changes.
 * Data flow: receives state via props, sends user actions via emits for the
 *   parent to forward to the overlay controller. The drag algorithm lives
 *   in `utils/dev/draggable_panel.ts` (H5-only, browser globals isolated);
 *   the Vue-reactive wiring around it (anchor, dragging flag,
 *   containerStyle, pointer handlers, click suppression) is the
 *   `use_dev_panel_drag` composable, so this shell stays a thin view. Each
 *   row sub-component receives only the slice of state it needs and
 *   re-emits its row-local events; this shell forwards them up one-to-one.
 */
import type { OverlayPhase } from '../../flows/base/composables/animations/phase_contracts'
import { useDevPanelDrag } from '../composables/use_dev_panel_drag'
import DevToolsCollapsedIcon from './DevToolsCollapsedIcon.vue'
import DevToolsPhaseRow from './DevToolsPhaseRow.vue'
import DevToolsPlaybackRow from './DevToolsPlaybackRow.vue'
import DevToolsControlRow from './DevToolsControlRow.vue'

const isDev = import.meta.env.DEV

defineProps<{
  phaseSteps: { phase: OverlayPhase; label: string }[]
  playbackRate: number
  isPaused: boolean
  isDevExpanded: boolean
  showContainerBorders: boolean
}>()

const emit = defineEmits<{
  (e: 'replay', phase: OverlayPhase): void
  (e: 'skip-to-answer'): void
  (e: 'playback-rate', rate: number): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'step-forward'): void
  (e: 'step-backward'): void
  (e: 'toggle-dev-expanded'): void
  (e: 'toggle-container-borders'): void
}>()

// ---- Drag wiring (extracted to a composable; shell stays a thin view) ----

const { isDragging, containerStyle, onMouseDown, onTouchStart, consumeClick } =
  useDevPanelDrag()

function onHandleClick() {
  // A click that is the synthetic tail of a drag must not toggle the panel.
  if (consumeClick()) return
  emit('toggle-dev-expanded')
}
</script>

<style scoped>
.dev-tools {
  position: fixed;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  border-radius: 20rpx;
  background: rgba(247, 240, 224, 1);
  border: 1rpx solid var(--color-border-strong);
  box-shadow: 0 12rpx 36rpx rgba(30, 15, 6, 0.16);
  /* `touch-action: none` lets us own all pointer gestures and prevents the
     browser from stealing the drag for native scrolling. */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Expanded state: the historical 420rpx panel. */
.dev-tools:not(.dev-tools--collapsed) {
  width: 420rpx;
  max-width: calc(100vw - 48rpx);
  padding: 18rpx;
}

/* Collapsed state: 40 px circular handle. Width/height in physical px so
   the hit-target stays at the 40 px touch minimum across DPR — rpx would
   shrink the handle on narrow phones below the recommended floor. */
.dev-tools--collapsed {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.dev-tools--dragging {
  cursor: grabbing;
  /* Slight shadow lift to telegraph the active drag. */
  box-shadow: 0 16rpx 48rpx rgba(30, 15, 6, 0.32);
}

.dev-tools-handle {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  cursor: inherit;
}

.dev-tools--collapsed .dev-tools-handle {
  justify-content: center;
}

.dev-tools-title {
  font-size: 22rpx;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.dev-tools-toggle {
  font-size: 18rpx;
  color: var(--color-text-secondary);
  line-height: 1;
}

.dev-tools-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 12rpx;
}
</style>
