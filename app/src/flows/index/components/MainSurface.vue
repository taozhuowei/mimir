<template>
  <!--
    Main divination surface (docs/prd/glossary.md（路由 #1）). Composes the
    divination surface — HeaderArea (TitleContent ↔ ProgressContent by
    phase) + Stage (CardsLoadError | StageDeck) — with the inline answer
    zone (AnswerInscription + ActionArea) struck below the result card in
    'answer'/'decision'; no split / drawer / side panel. NotificationHost
    sits on the surface root for cross-view alerts. The .canvas wrapper
    caps the divination canvas at MAX_CANVAS_WIDTH
    (docs/prd/animation.md（视图过渡动画）), centered, and no longer slides
    flush-left (the wide-split overlay was removed). The single StageDeck
    instance stays mounted across idle ↔ divination, so the swap is a
    header-content change only. Mounted by pages/index.vue only when
    bootstrap did not fail (the fallback view is its mutually-exclusive
    sibling) — so useMainStage is never constructed in the failed state.
  -->
  <view
    class="main-page"
    :style="cssVarStyle"
  >
    <view class="canvas">
      <!--
        Header presentation comes from useHeaderPresentation. The idle
        card-load error band is its own component, gated by v-if/v-else
        against StageDeck so StageDeck is not mounted while erroring at idle.
      -->
      <view class="play-view" :class="{ 'play-view--error': isIdle && cardsLoadError }">
        <HeaderArea
          :role="headerRole"
          :aria-valuetext="headerAriaValuetext"
          :style="headerStyle"
        >
          <TitleContent v-if="isIdle" variant="idle" />
          <ProgressContent v-else />
        </HeaderArea>
        <Stage :scene="isIdle ? 'idle' : 'divination'">
          <CardsLoadError v-if="isIdle && cardsLoadError" />
          <StageDeck v-else />
        </Stage>

        <!-- The answer is struck directly below the card once the draw
             resolves (phase ∈ answer/decision). No split / drawer overlay. -->
        <view v-if="showAnswer" class="answer-zone">
          <AnswerInscription
            :state="answerPanelState"
            :answer-result="answerResult"
            :error-message="answerErrorMessage"
            @answer-revealed="handleAnswerRevealed"
          />
          <ActionArea
            :phase="phase"
            :is-answer-failed="answerPanelState === 'error'"
            @restart="handleRestart"
            @back-home="handleBackHome"
            @retry="handleRetry"
          />
        </view>
      </view>
    </view>

    <NotificationHost />
    <DevToolsPanel
      :phase-steps="animationController.phaseSteps.value"
      :playback-rate="animationController.playbackRate.value"
      :is-paused="animationController.isPaused.value"
      :is-dev-expanded="devTools.isDevExpanded.value"
      :show-container-borders="devTools.showContainerBorders.value"
      @replay="devTools.handleDevReplay"
      @skip-to-answer="devTools.handleDevSkipToAnswer"
      @playback-rate="devTools.handleDevPlaybackRate"
      @pause="animationController.pauseAnimations"
      @resume="animationController.resumeAnimations"
      @step-forward="animationController.stepForward"
      @step-backward="animationController.stepBackward"
      @toggle-dev-expanded="devTools.isDevExpanded.value = !devTools.isDevExpanded.value"
      @toggle-container-borders="devTools.toggleContainerBorders"
    />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: flows/index/components/MainSurface
 * Purpose: the main divination surface. Instantiates the orchestration
 *          graph via useMainStage, provides phase / isWide / the two
 *          controllers to descendant components, derives header
 *          presentation + the idle card-load error, and composes the
 *          divination surface (HeaderArea + Stage(StageDeck)) with the
 *          inline answer zone (AnswerInscription + ActionArea),
 *          notifications and dev tools.
 * Reason: extracted out of pages/index.vue so that page is a pure
 *         boot shell — it mounts this surface only when bootstrap
 *         succeeded (or is pending), and the fallback view otherwise, so
 *         useMainStage is never constructed in the failed state.
 */
import { provide } from 'vue'
import HeaderArea from '../../shared/components/HeaderArea.vue'
import TitleContent from '../../shared/components/TitleContent.vue'
import ProgressContent from '../../divination/components/ProgressContent.vue'
import Stage from '../../shared/components/Stage.vue'
import StageDeck from './StageDeck.vue'
import CardsLoadError from '../../idle/components/CardsLoadError.vue'
import AnswerInscription from '../../answer/components/AnswerInscription.vue'
import ActionArea from '../../answer/components/ActionArea.vue'
import NotificationHost from './NotificationHost.vue'
import DevToolsPanel from './DevToolsPanel.vue'
import { useMainStage } from '../composables/use_main_stage'
import { useHeaderPresentation } from '../composables/use_header_presentation'
import { useCardsLoadError } from '../../../core/composables/use_cards_load_error'

const {
  phase, isWide, cssVarStyle, animationController, answerController, devTools,
  showAnswer, answerPanelState, answerResult, answerErrorMessage,
  handleRestart, handleBackHome, handleRetry, handleAnswerRevealed,
} = useMainStage()

provide('appPhase', phase)
provide('isWide', isWide)
provide('animationController', animationController)
provide('answerController', answerController)

const { isIdle, headerRole, headerAriaValuetext, headerStyle } =
  useHeaderPresentation(phase, animationController)
const { cardsLoadError } = useCardsLoadError()
</script>

<style scoped>
.main-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-page);
}

/* docs/prd/animation.md（视图过渡动画） — canvas capped at MAX_CANVAS_WIDTH
   (440 px), centered on wider viewports via translateX max-clamp. The
   the split/drawer overlay was removed, so the canvas no longer
   slides flush-left. */
.canvas {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: 440px;
  transform: translateX(max(0px, calc((100vw - 440px) / 2)));
  transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* The answer zone is struck into the lower half of the play surface,
   below the (lifted) card. Bottom-anchored, scrolls internally if a long
   quote + its translation overflow on short viewports so the action row
   never gets clipped. No sheet chrome, no drag — it is part of the
   canvas, not an overlay. */
.answer-zone {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-height: 60%;
  overflow-y: auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-2));
  animation: answer-zone-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes answer-zone-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Divination surface root: flex column with uniform safe-area + margin
   padding. `--margin` is set on the main-page root via the scale bridge,
   so the same value scales across iPhone 8 → 17 Pro Max. */
.play-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--margin));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--margin));
  padding-left: var(--margin);
  padding-right: var(--margin);
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  .canvas {
    transition: none;
  }
  .answer-zone {
    animation: none;
  }
}
</style>
