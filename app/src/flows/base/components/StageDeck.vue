<template>
  <!--
    StageDeck — single persistent stage-content instance. Stays mounted from
    idle (fan loop) → divination (shuffle / cut / draw / reveal) →
    answer, so the idle ↔ divination swap has no visual gap.

    Composition:
      - DeckFanStack  — idle fan-loop visuals (12-card stack + bottom hint).
                        Visible only during flow === 'idle'.
      - DeckRig       — divination GSAP rig (initials/shuffle halves/cut
                        piles/3D-flip draws). Always mounted; visibility
                        of its sub-elements is gated by the animation
                        controller's own phase-driven flags.

    Accessibility:
      - In idle the wrapper carries `role="button"` so screen readers
        announce the tap target.
      - In divination the wrapper drops the button role and exposes the
        deck as `role="img"` with the divination label.
  -->
  <view
    class="deck"
    :class="{ 'deck--idle': isIdle }"
    :style="rootStyle"
    :role="isIdle ? 'button' : 'img'"
    :tabindex="isIdle ? 0 : -1"
    :aria-label="isIdle ? '开始占卜' : '占卜牌堆'"
    @click="isIdle ? handleClick() : undefined"
    @keydown.enter="isIdle ? handleClick() : undefined"
    @keydown.space.prevent="isIdle ? handleClick() : undefined"
  >
    <DeckFanStack
      :visible="isIdle"
      :deck-size="deckSize"
      :card-back="cardBack"
      :container-style="deckContainerStyle"
      :cards-style="cardsStyle"
      :hint-opacity="hintOpacity"
    />

    <DeckRig
      v-show="!isIdle"
      :anim-ctrl="animCtrl"
      :card-back="cardBack"
      :get-card-img="getCardImg"
      :get-card-img-name="getCardImgName"
    />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: StageDeck (stage content)
 * Purpose: single persistent deck/card surface. Renders the idle fan loop
 *          when flow === 'idle' and the full shuffle/cut/draw/reveal rig
 *          in every other flow; the visuals are delegated to DeckFanStack
 *          + DeckRig while this file is the assembly + click/keyboard
 *          handler + reactive plumbing for the GSAP fan controller.
 * Data flow:
 *          - injected animationController owns the shuffle/cut/draw/reveal
 *            state surfaces (deckCtnStyle, initialsStyle, drawsStyle, …).
 *          - injected flow drives idle vs. non-idle visibility on the
 *            fan stack / hint.
 *          - usePlayDeckAnimation drives the fan loop and click handler;
 *            the SFC is declarative.
 *          - tarotStore / themeStore imported directly for card images.
 */
import { computed, inject } from 'vue'
import type { Ref } from 'vue'
import type { UseAnimationControllerReturn } from '../../divination/composables/use_animation_controller'
import { useTarotStore } from '../../../core/store/tarot'
import { useThemeStore } from '../../../core/store/theme'
import { usePlayDeckAnimation } from '../composables/use_play_deck_animation'
import type { Flow } from '../../../core/store/slices/flow'
import DeckFanStack from '../../idle/components/DeckFanStack.vue'
import DeckRig from '../../divination/components/DeckRig.vue'

const animCtrl = inject<UseAnimationControllerReturn>('animationController')!
const flow = inject<Ref<Flow>>('flow')!
const tarotStore = useTarotStore()
const themeStore = useThemeStore()

const cardBack = computed(() => themeStore.cardBackImage)

/** Idle gate — the fan stack / hint render only in this flow; the
 *  divination rig stays mounted (its inner sub-elements are visibility-
 *  gated by the animation controller's own state). */
const isIdle = computed(() => flow.value === 'idle')

/* MainSurface flex 纵向四段（HeaderArea + Stage + .answer-zone +
 * ActionArea 兄弟节点自然分布）：Stage 占剩余高度且卡牌严格 flex 居中，
 * answer-zone 紧贴下方。原 result-card-lift-y 升起让位机制由
 * .main-surface__body--with-answer Stage translateY 关键帧替代，
 * 详见 docs/research/layout_final_rem.md。 */
const rootStyle = computed(() => animCtrl.overlayVarsStyle.value)

function getCardImg(idx: number): string {
  return tarotStore.drawnCards[idx]?.card.image || themeStore.cardBackImage
}

function getCardImgName(idx: number): string | undefined {
  return tarotStore.drawnCards[idx]?.card.name
}

/* ── Fan / click animation surface ────────────────────────────────── */

const {
  deckSize,
  deckContainerStyle,
  cardsStyle,
  hintOpacity,
  handleClick,
} = usePlayDeckAnimation({
  /**
   * Promote the application flow synchronously. The composable's
   * `watch(flow)` picks up the change and runs the idle→divination
   * hand-off (kill fan + start divination rig).
   */
  onTriggerDivination: () => { tarotStore.startDivination(tarotStore.currentQuestion) },
})
</script>

<style scoped>
/* The deck wrapper occupies the full Stage and stacks every layer in
   one absolute box. `isolation: isolate` keeps any future blend modes
   contained. `pointer-events: none` lets per-layer pointer-events
   re-enable interaction; the .stage-pointer modifier handles that. */
.deck {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  pointer-events: none;
}

/* Idle wrapper picks up pointer events so taps are captured. */
.deck.deck--idle {
  cursor: pointer;
  pointer-events: auto;
  transform-origin: center center;
}
</style>
