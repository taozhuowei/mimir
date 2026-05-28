<template>
  <!--
    DeckFanStack — idle sub-component of the unified Deck. Renders the
    12-card fan-loop stack (docs/animation.md（动画分帧）) and the bottom touch-hint band.
    Both roots are gated on `visible` (driven by phase === 'idle' in the
    parent) so the divination rig under it can render cleanly during
    shuffle / cut / draw / reveal.

    Multi-root template note: the fan stack and hint are intentionally
    rendered as siblings (not nested) because the hint is positioned
    relative to the Deck root (`bottom: env(safe-area-inset-bottom) + 80rpx`),
    not the fan-stack box (which is sized to a single card). Wrapping
    them in a single `<view>` would make the fan-stack the positioning
    ancestor for the hint and break its layout.
  -->
  <view
    v-show="visible"
    class="fan-stack"
    :style="containerStyle"
  >
    <image
      v-for="i in deckSize"
      :key="`fan${i}`"
      class="fan-stack__card"
      :src="cardBack"
      :style="cardsStyle[i - 1]"
      role="img"
      aria-label="塔罗牌背面"
    />
  </view>

  <view
    v-show="visible"
    class="fan-stack__hint"
    :style="{ opacity: hintOpacity }"
  >
    <view class="fan-stack__hint-line" />
    <text class="fan-stack__hint-text font-display">TOUCH TO DIVINE</text>
    <view class="fan-stack__hint-line" />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: DeckFanStack (stage content sub-component)
 * Purpose: encapsulate the idle fan-loop visuals (12-card stack + bottom
 *          hint band) so the parent Deck.vue stays under the file-size cap
 *          and reads as a pure assembly of {idle stack, divination rig}.
 * Reason: extracted from Deck.vue (P3-1) — Deck.vue grew to 437 lines as
 *         the unified replacement for IdleDeck + DivinationDeck (task
 *         8.2.3); splitting the idle visuals out keeps each file focused
 *         on a single responsibility.
 * Data flow: pure presentational — every reactive value is passed in as
 *         a prop. The parent owns the GSAP fan controller (via
 *         `usePlayDeckAnimation`); this component is a stateless render.
 */

defineProps<{
  /** Phase gate — fan + hint render only when true (idle phase). */
  visible: boolean
  /** Number of cards in the fan stack (docs/animation.md（动画分帧）, fixed at 12). */
  deckSize: number
  /** Card back image (theme-driven). */
  cardBack: string
  /** Fan-stack container size — matches the draw card size so idle →
   *  divination keeps stable visual scale with no jump. */
  containerStyle: { width: string; height: string }
  /** Per-card transform inline styles, driven by the GSAP fan timeline. */
  cardsStyle: Record<string, string>[]
  /** Bottom hint opacity (0 → 0.6 entrance fade, idle only). */
  hintOpacity: number
}>()
</script>

<style scoped>
/* ── Idle fan stack ──────────────────────────────────────────────── */

.fan-stack {
  position: relative;
  z-index: 10;
}

.fan-stack__card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 物理 5 px 圆角，跨 .tarot-card / cut-pile.pile-card 统一，不随 rpx
     缩放，使牌堆从 idle 到揭示在所有屏宽下都呈现一致的实体圆角。 */
  border-radius: 5px;
  /* uni-app <image> 在 H5 渲染为含内层方角位图节点的 uni-image，host 上的
     border-radius 不裁剪内层位图，必须配 overflow: hidden 才裁——否则方角
     位图溢出圆角边框，视觉上像"缺角"。与 DeckRig 的 .tarot-card 保持一致。 */
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: 0 2rpx 8rpx rgba(30, 15, 6, 0.3);
}

/* Deepest shadow on the bottom card — H5 only because mp-weixin
   doesn't reliably support `:first-child` on `<image>` tags. */
/* #ifdef H5 */
.fan-stack__card:first-child {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
/* #endif */

/* ── Idle touch hint ─────────────────────────────────────────────── */

.fan-stack__hint {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 80rpx);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  pointer-events: none;
}

.fan-stack__hint-line {
  width: 50rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, var(--color-border-strong), transparent);
}

.fan-stack__hint-text {
  /* hint 用 --font-xs（14PM 真值 12，运行时 × deriveFontScale 缩到 ≥10）。
     --leading-flat 抵消 page 默认 1.6 撑高的盒子。 */
  font-size: var(--font-xs);
  line-height: var(--leading-flat);
  color: var(--color-text-muted);
  letter-spacing: var(--tracking-widest);
}

@media (prefers-reduced-motion: reduce) {
  .fan-stack__card,
  .fan-stack__hint {
    transition: none !important;
    animation: none !important;
  }
}
</style>
