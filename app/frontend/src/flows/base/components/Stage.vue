<template>
  <!--
    Stage — phase-2.1 placeholder.
    A position-only slot container; per docs/glossary.md（容器 #3） the stage exists purely
    to host an animation. It does not own animation state — the parent view
    or the animation controller drives whatever is rendered through the
    default slot. The `scene` prop only annotates the DOM with a CSS class
    so per-scene styling hooks stay simple.
  -->
  <view
    class="stage"
    :class="`stage--${scene}`"
    role="presentation"
  >
    <slot>
      <text class="stage__placeholder">Stage / scene: {{ scene }}</text>
    </slot>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: Stage container
 * Purpose: pure slot wrapper for the three stage scenes (idle / divination
 *          / loading) per docs/glossary.md（容器 #3） and docs/view.md（4 个视图与所属容器）.
 * Reason: idle, divination, and loading views all need a centred animation
 *         box. Centralising the geometry here keeps the per-view templates
 *         minimal. Animation logic is *not* hosted here — it lives in the
 *         existing controllers and is wired into the slot content.
 * Data flow: parent view passes `scene`; child content (a stage-content
 *           component) is provided via the default slot.
 */
type StageScene = 'idle' | 'divination' | 'loading'

withDefaults(
  defineProps<{
    scene?: StageScene
  }>(),
  { scene: 'idle' },
)
</script>

<style scoped>
.stage {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  pointer-events: none;
}

/* No blanket :slotted reset here. The stage is presentation-only
   (pointer-events: none); each slot content owns its own interactivity —
   StageDeck via .deck / .deck--idle, CardsLoadError on its root. A universal
   :slotted(*) also fails WXSS compilation on mp-weixin (no `*` selector). */

.stage__placeholder {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
  letter-spacing: var(--tracking-wide);
  pointer-events: auto;
}
</style>
