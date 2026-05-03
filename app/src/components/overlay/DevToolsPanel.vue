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
      <text v-if="!isDevExpanded" class="dev-tools-handle__icon" aria-hidden="true">⚡</text>
      <template v-else>
        <text class="dev-tools-title">Dev Tools</text>
        <text class="dev-tools-toggle" aria-hidden="true">▲</text>
      </template>
    </view>

    <view v-show="isDevExpanded" class="dev-tools-body">
      <!-- Phase replay chips -->
      <view class="dev-tools-row">
        <view
          v-for="step in phaseSteps"
          :key="`replay-${step.phase}`"
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          :aria-label="`重播 ${step.label}`"
          @click="$emit('replay', step.phase)"
          @keydown.enter="$emit('replay', step.phase)"
          @keydown.space.prevent="$emit('replay', step.phase)"
        >
          {{ step.label }}
        </view>
      </view>

      <!-- Skip to reading + playback speed chips -->
      <view class="dev-tools-row">
        <view
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          aria-label="跳到解读"
          @click="$emit('skip-to-reading')"
          @keydown.enter="$emit('skip-to-reading')"
          @keydown.space.prevent="$emit('skip-to-reading')"
        >
          直接解读
        </view>
        <view
          v-for="speed in playbackRates"
          :key="`speed-${speed}`"
          class="dev-tools-chip"
          :class="{ active: playbackRate === speed }"
          role="button"
          tabindex="0"
          :aria-label="`播放速度 ${speed}x`"
          @click="$emit('playback-rate', speed)"
          @keydown.enter="$emit('playback-rate', speed)"
          @keydown.space.prevent="$emit('playback-rate', speed)"
        >
          {{ speed }}x
        </view>
      </view>

      <!-- Pause / resume / step controls -->
      <view class="dev-tools-row">
        <view
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          aria-label="暂停"
          @click="$emit('pause')"
          @keydown.enter="$emit('pause')"
          @keydown.space.prevent="$emit('pause')"
        >
          暂停
        </view>
        <view
          class="dev-tools-chip"
          role="button"
          tabindex="0"
          aria-label="继续"
          @click="$emit('resume')"
          @keydown.enter="$emit('resume')"
          @keydown.space.prevent="$emit('resume')"
        >
          继续
        </view>
        <view
          class="dev-tools-chip"
          :class="{ disabled: !isPaused }"
          role="button"
          tabindex="0"
          aria-label="后退一步"
          @click="isPaused && $emit('step-backward')"
          @keydown.enter="isPaused && $emit('step-backward')"
          @keydown.space.prevent="isPaused && $emit('step-backward')"
        >
          ←
        </view>
        <view
          class="dev-tools-chip"
          :class="{ disabled: !isPaused }"
          role="button"
          tabindex="0"
          aria-label="前进一步"
          @click="isPaused && $emit('step-forward')"
          @keydown.enter="isPaused && $emit('step-forward')"
          @keydown.space.prevent="isPaused && $emit('step-forward')"
        >
          →
        </view>
        <text class="dev-tools-status">
          {{ isPaused ? 'Paused' : `Running ${playbackRate}x` }}
        </text>
      </view>

      <!-- Container borders toggle -->
      <view class="dev-tools-row">
        <view
          class="dev-tools-chip"
          :class="{ active: showContainerBorders }"
          role="button"
          tabindex="0"
          aria-label="显示容器边框"
          @click="$emit('toggle-container-borders')"
          @keydown.enter="$emit('toggle-container-borders')"
          @keydown.space.prevent="$emit('toggle-container-borders')"
        >
          容器边框
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DevToolsPanel
 * Purpose: dev-only panel for phase replay, playback control, and safe-frame overlay toggle.
 * Reason: extracted from DivinationOverlay to reduce component complexity.
 *   Per requirement N1 the collapsed state is now a 40 px circular handle
 *   the developer can drag to any corner of the screen — handy when the
 *   panel obscures whatever they're currently inspecting. Position is
 *   intentionally NOT persisted: refresh resets to the bottom-right
 *   default so a stuck off-screen panel always recovers naturally.
 * Data flow: receives state via props, sends user actions via emits for the
 *   parent to forward to the overlay controller. Drag gestures are owned by
 *   `utils/dev/draggable_panel.ts` (H5-only), keeping browser globals out of
 *   this component.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { OverlayPhase } from '../../core/flow/types'
import {
  createDraggablePanel,
  type Position,
} from '../../utils/dev/draggable_panel'

const isDev = import.meta.env.DEV
const playbackRates = [0.25, 0.5, 1, 2] as const

defineProps<{
  phaseSteps: { phase: OverlayPhase; label: string }[]
  playbackRate: number
  isPaused: boolean
  isDevExpanded: boolean
  showContainerBorders: boolean
}>()

const emit = defineEmits<{
  (e: 'replay', phase: OverlayPhase): void
  (e: 'skip-to-reading'): void
  (e: 'playback-rate', rate: number): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'step-forward'): void
  (e: 'step-backward'): void
  (e: 'toggle-dev-expanded'): void
  (e: 'toggle-container-borders'): void
}>()

// ---- Drag state ----------------------------------------------------------

/**
 * Anchor point in viewport pixels (top-left of the panel). Starts null
 * until first mount; resolved to the default bottom-right corner using
 * actual viewport metrics inside the H5-only controller.
 */
const position = ref<Position | null>(null)
const isDragging = ref(false)

/** When true, the next click is the synthetic tail of a drag and must
 *  be swallowed so the gesture doesn't toggle the panel. */
let suppressNextClick = false

const containerStyle = computed(() => {
  if (!position.value) return ''
  return `left: ${position.value.x}px; top: ${position.value.y}px;`
})

const dragger = createDraggablePanel({
  setPosition(next) {
    position.value = next
  },
  getPosition() {
    return position.value ?? { x: 0, y: 0 }
  },
  onDragStart() {
    isDragging.value = true
  },
  onDragEnd({ wasDrag }) {
    isDragging.value = false
    if (wasDrag) suppressNextClick = true
  },
})

function onMouseDown(e: MouseEvent) {
  // First press also resolves the initial position so the controller has
  // a real anchor to mutate from (mount may run before any layout
  // measurement is meaningful).
  if (!position.value) position.value = dragger.defaultPosition()
  dragger.startMouseDrag(e)
}

function onTouchStart(e: TouchEvent) {
  if (!position.value) position.value = dragger.defaultPosition()
  dragger.startTouchDrag(e)
}

function onHandleClick() {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  emit('toggle-dev-expanded')
}

onMounted(() => {
  // Resolve initial position once the H5 controller can read window metrics.
  position.value = dragger.defaultPosition()
})

onBeforeUnmount(() => {
  dragger.dispose()
})
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

.dev-tools-handle__icon {
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-primary);
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

.dev-tools-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  align-items: center;
}

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

.dev-tools-status {
  font-size: 20rpx;
  color: var(--color-text-tertiary);
  margin-left: auto;
}
</style>
