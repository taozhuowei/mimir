<template>
  <!--
    IdleView — phase-2.1 skeleton.
    Composition per PRD §7.2 #1: HeaderArea(TitleContent) + Stage(IdleDeck).
    Business logic (deck animation, header GSAP, layout solver) migrates
    from pages/index/index.vue in 2.2. The header is wrapped in
    HeaderArea (task 8.3.1) so the slot geometry matches DivinationView's
    progress header byte-for-byte and the idle ↔ divination swap does
    not jump.
  -->
  <view class="idle-view" :class="{ 'idle-view--error': cardsLoadError }">
    <HeaderArea role="banner">
      <TitleContent variant="idle" />
    </HeaderArea>
    <Stage scene="idle">
      <view
        v-if="cardsLoadError"
        class="idle-view__error"
      >
        <text class="idle-view__error-text">{{ cardsLoadError }}</text>
        <view
          class="idle-view__retry"
          role="button"
          tabindex="0"
          :aria-disabled="isCardsLoading ? 'true' : 'false'"
          @click="handleRetry"
          @keydown.enter="handleRetry"
          @keydown.space.prevent="handleRetry"
        >{{ isCardsLoading ? '感应中...' : '重新感应' }}</view>
      </view>
      <IdleDeck
        v-else
        @trigger-divination="$emit('triggerDivination')"
      />
    </Stage>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: IdleView
 * Purpose: top-level view for the application's idle phase (PRD §2.3 #1).
 *          Owns the title slot and the idle stage; user taps on the stage
 *          bubble up via `triggerDivination`.
 * Reason: makes the idle composition declarative and decouples business
 *         logic from layout. The legacy `pages/index/index.vue` keeps
 *         working in 2.1 — its content is migrated in 2.2.
 * Data flow: parent main page passes resource-load state in (`cardsLoadError`,
 *           `isCardsLoading`); the view emits `triggerDivination` and
 *           `retryLoadCards` so the page can drive store actions.
 */
import HeaderArea from '../components/containers/HeaderArea.vue'
import TitleContent from '../components/containers/TitleContent.vue'
import Stage from '../components/containers/Stage.vue'
import IdleDeck from '../components/stage-content/IdleDeck.vue'

const props = defineProps<{
  cardsLoadError: string | null
  isCardsLoading: boolean
}>()

const emit = defineEmits<{
  (event: 'triggerDivination'): void
  (event: 'retryLoadCards'): void
}>()

function handleRetry() {
  if (props.isCardsLoading) return
  emit('retryLoadCards')
}
</script>

<style scoped>
.idle-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  /* Uniform safe-area + margin handling shared with DivinationView. The
     CSS variable `--margin` is set on the main-page root via the scale
     bridge (pages/main/index.vue), so the same value scales across
     iPhone 8 → 17 Pro Max without per-view subscription. */
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--margin));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--margin));
  padding-left: var(--margin);
  padding-right: var(--margin);
  box-sizing: border-box;
}

.idle-view__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.idle-view__error-text {
  font-size: 24rpx;
  color: var(--color-no);
  text-align: center;
  max-width: 80%;
  word-break: break-word;
}

.idle-view__retry {
  padding: 18rpx 40rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  background: linear-gradient(to bottom, var(--color-btn-primary-from), var(--color-btn-primary-to));
  color: var(--color-btn-primary-text);
}

</style>
