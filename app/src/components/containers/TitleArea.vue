<template>
  <!--
    TitleArea — phase-2.2.a migration target.
    Hosts the heading copy described in PRD §7.3 #1:
      - 'idle'     → 主标题 / 副标题 / 引导文字 with GSAP staggered entrance
      - 'fallback' → single neutral line "宇宙信号微弱，暂无法接通"
    The GSAP entrance comes from the legacy pages/index/index.vue header
    block; we keep the same DOM-free animation pattern so MP-WeChat doesn't
    need DOM refs.

    Sizing: all dimensions / fonts come from the proportional scale system
    via CSS custom properties bound on `pages/main/index.vue`'s root. This
    component reads `var(--header-height)`, `var(--font-xxl)` etc; it does
    NOT subscribe to `useResponsiveScale` directly.
  -->
  <view
    class="title-area"
    :class="`title-area--${variant}`"
    role="banner"
  >
    <template v-if="variant === 'idle'">
      <text class="title-area__title font-display" :style="titleStyle">{{ COPY.idle.title }}</text>
      <text class="title-area__subtitle" :style="subtitleStyle">{{ COPY.idle.subtitle }}</text>
      <text class="title-area__guidance" :style="guidanceStyle">{{ COPY.idle.guidance }}</text>
      <text v-if="errorDetail" class="title-area__error">{{ errorDetail }}</text>
    </template>
    <template v-else-if="variant === 'fallback'">
      <text class="title-area__fallback">{{ COPY.fallback.line }}</text>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: TitleArea container
 * Purpose: position-only wrapper for the heading copy described in
 *          PRD §2.4 #1 / §7.3 #1. Two variants:
 *            - 'idle'     → main title / subtitle / guidance line (with
 *              GSAP entrance staggered ~80ms apart, matching the legacy
 *              pages/index/index.vue behaviour).
 *            - 'fallback' → single neutral mystery line (PRD §10.3 #4).
 * Reason: idle and fallback views both need a top-anchored title slot, but
 *         the copy and tone differ. Centralising the slot here keeps the
 *         per-view templates declarative.
 * Data flow: parent view picks the variant. Idle variant runs its own
 *            entrance timeline on mount (DOM-free state objects + style
 *            refs, identical to the legacy pattern). Reduced-motion users
 *            get the final state immediately.
 */
import { onUnmounted, ref, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../../utils/accessibility'

const props = withDefaults(
  defineProps<{
    variant?: 'idle' | 'fallback'
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
} as const

/* ── DOM-free animation state (MP-WeChat compatible) ──────────────── */

const titleStyle = ref<Record<string, string>>({})
const subtitleStyle = ref<Record<string, string>>({})
const guidanceStyle = ref<Record<string, string>>({})

const _title = { y: 20, opacity: 0 }
const _subtitle = { y: 20, opacity: 0 }
const _guidance = { y: 20, opacity: 0 }

function flushHeaderStyles() {
  titleStyle.value = {
    transform: `translateY(${_title.y}px)`,
    opacity: String(_title.opacity),
  }
  subtitleStyle.value = {
    transform: `translateY(${_subtitle.y}px)`,
    opacity: String(_subtitle.opacity),
  }
  guidanceStyle.value = {
    transform: `translateY(${_guidance.y}px)`,
    opacity: String(_guidance.opacity),
  }
}

function runEntranceAnimation() {
  if (props.variant !== 'idle') return

  // Reset DOM-free state every run so re-mount or variant flip starts fresh.
  _title.y = 20; _title.opacity = 0
  _subtitle.y = 20; _subtitle.opacity = 0
  _guidance.y = 20; _guidance.opacity = 0
  flushHeaderStyles()

  if (prefersReducedMotion()) {
    _title.y = 0; _title.opacity = 1
    _subtitle.y = 0; _subtitle.opacity = 1
    _guidance.y = 0; _guidance.opacity = 1
    flushHeaderStyles()
    return
  }

  const tl = gsap.timeline()
  tl.to(_title, {
    y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', onUpdate: flushHeaderStyles,
  })
    .to(_subtitle, {
      y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', onUpdate: flushHeaderStyles,
    }, 0.08)
    .to(_guidance, {
      y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', onUpdate: flushHeaderStyles,
    }, 0.16)
}

onMounted(() => {
  runEntranceAnimation()
})

// If the parent flips variant at runtime (e.g. fallback → idle on retry),
// re-run the entrance so the user sees a fresh fade-in instead of the
// stale opacity-0 state from the previous variant.
watch(() => props.variant, () => { runEntranceAnimation() })

onUnmounted(() => {
  gsap.killTweensOf(_title)
  gsap.killTweensOf(_subtitle)
  gsap.killTweensOf(_guidance)
})
</script>

<style scoped>
.title-area {
  height: var(--header-height);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Content top-aligned at the same y as ProgressArea's icon top so idle
     and divination headers visually share a baseline. Progress icons are
     44px centred in an 80px container -> their top is at
     (var(--header-height) - 44px) / 2 from the container top. We mirror
     that here instead of using justify-content: center, which would
     anchor by the geometric centre of the (taller) title content and
     visually appear higher than the progress icons. */
  padding-top: calc((var(--header-height) - 44px) / 2);
  box-sizing: border-box;
  gap: 4px;
  text-align: center;
  /* Title content is taller than (header - padding-top); allow the
     guidance line to extend a few px into the stage breathing area
     rather than clipping. */
  overflow: visible;
}

.title-area__title {
  font-size: var(--font-xxl);
  color: var(--color-text-primary);
  letter-spacing: 0.18em;
  text-shadow: 0 4rpx 12rpx rgba(74, 37, 16, 0.1);
  line-height: 1;
}

.title-area__subtitle {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  letter-spacing: 0.35em;
  text-transform: uppercase;
  line-height: 1.2;
}

.title-area__guidance {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.title-area__error {
  font-size: var(--font-xs);
  color: var(--color-no);
  letter-spacing: 0.04em;
  max-width: 80%;
  word-break: break-word;
  line-height: 1.2;
}

.title-area__fallback {
  font-size: var(--font-s);
  color: var(--color-text-secondary);
  letter-spacing: 0.18em;
}
</style>
