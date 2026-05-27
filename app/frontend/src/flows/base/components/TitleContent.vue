<template>
  <!--
    TitleContent — header slot payload for the idle / fallback views.
    Renders the heading copy described in docs/view.md（容器与内容对应 #1）:
      - 'idle'     → 主标题 / 副标题 / 引导文字 with GSAP staggered entrance
      - 'fallback' → single neutral line "宇宙信号微弱，暂无法接通"

    Layout responsibility split (task 8.3.1):
      - Outer geometry (margin-top, height, safe-area, z-index, horizontal
        centring) lives on HeaderArea. This component renders ONLY the
        text payload and an inner top anchor that aligns the first line
        with ProgressContent's icon-top y so idle ↔ divination header
        swaps share a baseline.
  -->
  <view
    class="title-content"
    :class="`title-content--${variant}`"
  >
    <template v-if="variant === 'idle'">
      <text class="title-content__title font-display" :style="titleStyle">{{ COPY.idle.title }}</text>
      <text class="title-content__subtitle" :style="subtitleStyle">{{ COPY.idle.subtitle }}</text>
      <text class="title-content__guidance" :style="guidanceStyle">{{ COPY.idle.guidance }}</text>
      <text v-if="errorDetail" class="title-content__error">{{ errorDetail }}</text>
    </template>
    <template v-else-if="variant === 'fallback'">
      <text class="title-content__fallback">{{ COPY.fallback.line }}</text>
    </template>
    <template v-else-if="variant === 'loading'">
      <text class="title-content__loading">{{ COPY.loading.line }}</text>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: TitleContent component
 * Purpose: render the heading copy (idle main/sub/guidance, or fallback
 *          single line) inside the shared HeaderArea shell. Delegates the
 *          idle staggered entrance to the `use_title_entrance` composable
 *          and switches copy tables for the fallback variant.
 * Reason: split out from the legacy TitleArea (task 8.3.1) so the outer
 *         shell can be unified with ProgressContent. This component holds
 *         no outer-box geometry — only the text payload and an inner top
 *         anchor that aligns the first line with ProgressContent's icon
 *         top y. The anchor is content-intrinsic, not a layout decision.
 *         F4 moved the entrance animation into the composable so this SFC
 *         stays a thin per-variant copy renderer.
 * Data flow: parent view picks the variant. The composable runs the idle
 *            entrance timeline on mount (DOM-free state objects + style
 *            refs, identical to the legacy pattern) and re-runs on a
 *            variant flip. Reduced-motion users get the final state
 *            immediately.
 */
import { toRef } from 'vue'
import { useTitleEntrance } from '../composables/use_title_entrance'

const props = withDefaults(
  defineProps<{
    variant?: 'idle' | 'fallback' | 'loading'
    /**
     * Optional secondary line for the idle error state. Rendered below
     * `guidance` so the user sees the resource error reason inline.
     */
    errorDetail?: string | null
  }>(),
  { variant: 'idle', errorDetail: null },
)

/** Static copy table — single source of truth for both variants. */
const COPY = {
  idle: {
    title: 'Scales Tarot',
    subtitle: '命运之轨 · 星辰之语',
    guidance: '轻触牌堆，聆听高维指引',
  },
  fallback: {
    line: '宇宙信号微弱，暂无法接通',
  },
  loading: {
    line: '正在接通星辰',
  },
} as const

/* Idle staggered entrance lives in a composable; this component is a
   thin per-variant copy renderer. */
const { titleStyle, subtitleStyle, guidanceStyle } = useTitleEntrance(
  toRef(props, 'variant'),
)
</script>

<style scoped>
.title-content {
  /* Inner flex column for stacking title / subtitle / guidance. The
     outer HeaderArea provides the box (margin, height, horizontal
     centre); this component handles the per-variant vertical stack. */
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 4px;
  text-align: center;

  /* Anchor the first text line at the same y as ProgressContent's
     44px-icon top, so idle and divination headers visually share a
     baseline. Progress icons are 44px centred in HeaderArea's
     `--header-height` slot, so their top sits at
     (var(--header-height) - 44px) / 2 from the slot's top edge.
     Mirroring that here is the legacy approach (preserved across the
     8.3.1 refactor) and is intrinsic to the text-stack content type —
     it would not make sense in HeaderArea, which serves both content
     types and must stay variant-agnostic. */
  padding-top: calc((var(--header-height) - 44px) / 2);
  box-sizing: border-box;
}

.title-content__title {
  /* xxl(32) → xl(24): 14PM 实测从 37px 收到 ~28px，去除 letter-spacing
     放大造成的"挤压感"，留出 subtitle/guidance 喘息空间。 */
  font-size: var(--font-xl);
  color: var(--color-text-primary);
  letter-spacing: 0.14em;
  text-shadow: 0 4rpx 12rpx rgba(74, 37, 16, 0.1);
  line-height: 1;
}

.title-content__subtitle {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  letter-spacing: 0.35em;
  text-transform: uppercase;
  line-height: 1.2;
}

.title-content__guidance {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.title-content__error {
  font-size: var(--font-xs);
  color: var(--color-no);
  letter-spacing: 0.04em;
  max-width: 80%;
  word-break: break-word;
  line-height: 1.2;
}

.title-content__fallback,
.title-content__loading {
  font-size: var(--font-s);
  color: var(--color-text-secondary);
  letter-spacing: 0.18em;
}

/* Loading line gets a soft breathing pulse so the boot wait reads as
   "working", not stalled. Reduced-motion users see the static line. */
.title-content__loading {
  animation: title-loading-pulse 1.8s ease-in-out infinite;
}

@keyframes title-loading-pulse {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .title-content__loading {
    animation: none;
    opacity: 1;
  }
}
</style>
