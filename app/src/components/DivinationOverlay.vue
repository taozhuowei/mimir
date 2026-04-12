<template>
  <view class="divination-overlay" :class="{ 'show-results': controller.showResults.value, 'is-wide': isWide }" :style="controller.overlayVarsStyle.value">
    <view class="overlay-bg" :style="controller.bgStyle.value" />

    <!-- Animation area: always present, shrinks to top/left after results shown -->
    <view class="stage-container" :style="controller.stageContainerStyle.value">
      <view class="progress-header" :style="controller.headerStyle.value">
        <view class="phase-progress-bar">
          <view
            v-for="(step, idx) in controller.phaseSteps.value"
            :key="step.phase"
            class="phase-step"
          >
            <image
              class="phase-step-icon"
              :class="{ 'phase-step-icon-compensated': idx < 2 }"
              :src="step.isActive || step.isCompleted ? themeStore.getUiAsset(getPhaseStep(step.phase)?.activeIcon || '') || themeStore.getUiAsset(getPhaseStep(step.phase)?.inactiveIcon || '') : themeStore.getUiAsset(getPhaseStep(step.phase)?.inactiveIcon || '') || themeStore.getUiAsset(getPhaseStep(step.phase)?.activeIcon || '')"
              mode="aspectFit"
            />
          </view>
        </view>
      </view>

      <!-- Animation stage: :style drives GSAP y-lift animation -->
      <view class="stage" :style="controller.stageStyle.value">
        <!-- Deck container: :style drives shuffle shake animation -->
        <view class="deck-layer stage-pointer" :style="controller.deckCtnStyle.value">
          <!-- Initial deck (12 stacked cards): style driven by GSAP state object -->
          <image
            v-for="i in 12"
            :key="`m${i}`"
            class="tarot-card stack-card initial-deck"
            :src="controller.cardBack.value"
            :style="controller.initialsStyle.value[i-1]"
          />

          <!-- Shuffle left half: v-show + style driven by GSAP state object -->
          <image
            v-for="i in 6"
            :key="`l${i}`"
            v-show="controller.leftsVisible.value"
            class="tarot-card stack-card"
            :src="controller.cardBack.value"
            :style="controller.leftsStyle.value[i-1]"
          />
          <!-- Shuffle right half: v-show + style driven by GSAP state object -->
          <image
            v-for="i in 6"
            :key="`r${i}`"
            v-show="controller.rightsVisible.value"
            class="tarot-card stack-card"
            :src="controller.cardBack.value"
            :style="controller.rightsStyle.value[i-1]"
          />
        </view>

        <!-- Cut cards: v-show + style driven by GSAP state object; centerStyle uses calc(-50%+Xpx) for centering -->
        <image v-show="controller.cutTopVisible.value" class="tarot-card stage-center cut-t stage-pointer" :src="controller.cardBack.value" :style="controller.cutTopStyle.value" />
        <image v-show="controller.cutMidVisible.value" class="tarot-card stage-center cut-m stage-pointer" :src="controller.cardBack.value" :style="controller.cutMidStyle.value" />
        <image v-show="controller.cutBotVisible.value" class="tarot-card stage-center cut-b stage-pointer" :src="controller.cardBack.value" :style="controller.cutBotStyle.value" />

        <view class="draw-container">
          <!-- Drawn cards: v-show + style driven by GSAP state object; centerStyle uses calc(-50%+Xpx) for centering -->
            <view
              v-for="(_, idx) in controller.drawsVisible.value"
              :key="idx"
              v-show="controller.drawsVisible.value[idx]"
              class="draw-wrapper stage-center stage-pointer"
              :style="[controller.drawsStyle.value[idx], controller.drawsSizeStyle.value[idx]]"
            >
            <!-- 3D flip inner: style driven by GSAP rotationY -->
            <view class="card-3d-inner stage-pointer" :style="[controller.innersStyle.value[idx], controller.drawsSizeStyle.value[idx]]">
              <image class="tarot-card face-back" :src="controller.cardBack.value" />
              <view class="tarot-card face-front">
                <image class="front-img" :src="controller.getCardImg(idx)" />
              </view>
            </view>

            <!-- Upright/Reversed badge, fades in after results shown -->
            <view
              v-if="controller.showResults.value"
              class="position-badge"
              :class="tarotStore.drawnCards[idx]?.position ?? 'upright'"
            >
              <text class="badge-label font-display">
                {{ tarotStore.drawnCards[idx]?.position === 'reversed' ? controller.overlayText.positionReversed : controller.overlayText.positionUpright }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- Bottom action area: :style drives entry animation -->
      <view class="action-footer" :style="controller.footerStyle.value">
        <view class="actions">
          <!-- Show restart button after results are displayed -->
          <template v-if="controller.showResults.value">
            <view class="btn btn-primary" @click="handleRestart">{{ controller.overlayText.restart }}</view>
          </template>

          <template v-else-if="controller.phase.value === 'revealing'">
            <!-- Text hint + animated dots, shown while waiting for reading result -->
            <view class="revealing-hint font-display">
              {{ controller.overlayText.revealing }}
              <view class="thinking-dots">
                <text class="dot dot-1">.</text>
                <text class="dot dot-2">.</text>
                <text class="dot dot-3">.</text>
              </view>
            </view>
          </template>

          <!-- Retry button for failed reading -->
          <template v-else-if="controller.isReadingFailed.value">
            <view class="btn btn-primary" @click="handleRetry">{{ '重试' }}</view>
          </template>
        </view>
      </view>

      <!-- Dev Tools -->
      <view v-if="isDev" class="dev-tools">
        <text class="dev-tools-title">Dev Tools</text>

        <view class="dev-tools-row">
          <view
            v-for="step in phaseStepsForDev"
            :key="`replay-${step.phase}`"
            class="dev-tools-chip"
            @click="handleReplay(step.phase)"
          >
            {{ step.label }}
          </view>
        </view>

        <view class="dev-tools-row">
          <view
            v-for="speed in playbackRates"
            :key="`speed-${speed}`"
            class="dev-tools-chip"
            :class="{ active: controller.playbackRate.value === speed }"
            @click="handlePlaybackRate(speed)"
          >
            {{ speed }}x
          </view>
        </view>

        <view class="dev-tools-row">
          <view class="dev-tools-chip" @click="handlePause">
            暂停
          </view>
          <view class="dev-tools-chip" @click="handleResume">
            继续
          </view>
          <view
            class="dev-tools-chip"
            :class="{ disabled: !controller.isPaused.value }"
            @click="controller.isPaused.value && handleStepBackward()"
          >
            ←
          </view>
          <view
            class="dev-tools-chip"
            :class="{ disabled: !controller.isPaused.value }"
            @click="controller.isPaused.value && handleStepForward()"
          >
            →
          </view>
          <text class="dev-tools-status">
            {{ controller.isPaused.value ? 'Paused' : `Running ${controller.playbackRate.value}x` }}
          </text>
        </view>
      </view>
    </view>

    <!-- Result area: slides in from bottom/right after results shown -->
    <scroll-view
      v-if="controller.showResults.value"
      class="result-zone"
      :style="controller.resultZoneStyle.value"
      scroll-y
      enable-flex
    >
      <!-- Loading state -->
      <view v-if="controller.isReadingLoading.value" class="result-loading">
        <text class="loading-text">{{ controller.overlayText.revealing }}</text>
        <view class="thinking-dots">
          <text class="dot dot-1">.</text>
          <text class="dot dot-2">.</text>
          <text class="dot dot-3">.</text>
        </view>
      </view>

      <!-- Error state -->
      <view v-else-if="controller.isReadingFailed.value" class="result-error">
        <text class="error-text">{{ controller.readingErrorMessage.value }}</text>
        <view class="btn btn-primary" @click="handleRetry">{{ '重试' }}</view>
      </view>

      <!-- Success state -->
      <ResultPanel
        v-else-if="tarotStore.readingResult"
        :reading-result="tarotStore.readingResult"
        :question="tarotStore.currentQuestion"
        @restart="handleRestart"
      />
    </scroll-view>
  </view>
</template>

<!--
  File purpose: Full-screen divination overlay component
  - Includes shuffle / cut / draw three-phase animation
  - Displays tarot interpretation result (ResultPanel) after three phases
  - Supports responsive layout for wide (>=768px) and narrow screens

  Cross-platform compatibility (H5 & WeChat Mini Program):
  - Avoid window.innerWidth/innerHeight, use uni.getWindowInfo() instead
  - Avoid window.addEventListener/removeEventListener, use uni.onWindowResize/offWindowResize
  - Avoid getBoundingClientRect/offsetWidth/offsetHeight, calculate from window dimensions
  - GSAP cannot directly manipulate DOM elements, use "plain JS state object + onUpdate -> Vue ref<string> :style binding" pattern:
      1. Define plain JS state objects (e.g., _bg, _initials[], _draws[])
      2. GSAP tweens operate on state objects, refresh functions called in onUpdate
      3. Refresh functions serialize state objects to CSS style strings, written to Vue refs
      4. Template binds with :style="xxxStyle", Vue handles final DOM updates
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTarotStore } from '../stores/tarot'
import { useThemeStore } from '../stores/theme'
import ResultPanel from './ResultPanel.vue'
import { getSpreadCardCount } from '../utils/spread_layout'
import { useOverlayController } from '../composables/use_overlay_controller'
import { getPhaseStep, PHASE_STEPS } from '../utils/overlay_phase_registry'
import type { OverlayPhase } from '../utils/overlay_animations/types'

// Emits definition
const emit = defineEmits<{
  (event: 'complete'): void
  (event: 'restart'): void
}>()

const tarotStore = useTarotStore()
const themeStore = useThemeStore()
const isDev = import.meta.env.DEV
const playbackRates = [0.25, 0.5, 1, 2] as const

// Wide screen detection ref
const isWide = ref(false)

// Runtime card count from store spread kind
const cardCount = computed(() => getSpreadCardCount(tarotStore.spreadKind))

// Phase steps for dev tools
const phaseStepsForDev = PHASE_STEPS.map(s => ({
  phase: s.phase,
  label: s.label,
}))

// Initialize controller
const controller = useOverlayController({
  tarotStore,
  themeStore,
  isWide,
  cardCount,
  emit,
})

function handlePlaybackRate(rate: number) {
  controller.setPlaybackRate(rate)
}

function handlePause() {
  controller.pauseAnimations()
}

function handleResume() {
  controller.resumeAnimations()
}

function handleStepBackward() {
  controller.stepBackward()
}

function handleStepForward() {
  controller.stepForward()
}

function handleReplay(targetPhase: OverlayPhase) {
  controller.replayFromPhase(targetPhase)
}

function handleRestart() {
  controller.restart()
  emit('restart')
}

function handleRetry() {
  void controller.retryReading()
}
</script>

<style scoped>
.divination-overlay {
  --card-width: 172px;
  --card-height: calc(var(--card-width) * 1.6);

  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Layout transition */
  transition: flex-direction 0.4s ease;
}

/* #ifdef H5 */
.divination-overlay {
  --card-width: clamp(108px, 26vw, 172px);
}
/* #endif */

/* #ifdef MP-WEIXIN */
.divination-overlay {
  --card-width: clamp(88px, 22vw, 120px);
}
/* #endif */

.overlay-bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  /* Dark mystical background; opacity driven by GSAP fade-in */
  background: rgba(242, 232, 208, 0.97);
}

/* Post-result container deformation */
.stage-container {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  /* Default fills all vertical space */
  height: 100vh;
}

/* Wide screen: after results shown, animation area becomes left column */
.is-wide.show-results {
  flex-direction: row;
}

.is-wide.show-results .stage-container {
  flex: 0 0 44%;
  height: 100vh;
  width: 44%;
}

.result-zone {
  flex: 1;
  overflow-y: auto;
  animation: result-slide-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
  background: rgba(242, 232, 208, 0.92);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.is-wide .result-zone {
  border-top: none;
  border-left: 1px solid var(--color-border);
}

@keyframes result-slide-in {
  from {
    opacity: 0;
    transform: translateY(32px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes result-slide-in-right {
  from {
    opacity: 0;
    transform: translateX(32px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.is-wide .result-zone {
  animation-name: result-slide-in-right;
}

/* Progress header position */
.progress-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 20;
}

.phase-progress-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.phase-step {
  display: flex;
  align-items: center;
  justify-content: center;
}

.phase-step-icon {
  width: 40px;
  height: 40px;
  transition: opacity 0.2s ease;
}

.phase-step-icon-compensated {
  width: 44px;
  height: 44px;
}

/* #ifdef H5 */
.progress-header {
  margin-top: calc(env(safe-area-inset-top, 0px) + 60rpx);
}

.show-results .progress-header {
  margin-top: calc(env(safe-area-inset-top, 0px) + 20rpx);
}
/* #endif */

/* #ifdef MP-WEIXIN */
.progress-header {
  /* Mini program needs larger top margin to avoid notch(44px) + capsule button(32px) + extra spacing */
  margin-top: calc(env(safe-area-inset-top, 44px) + 140rpx);
}

.show-results .progress-header {
  margin-top: calc(env(safe-area-inset-top, 44px) + 80rpx);
}
/* #endif */

.stage {
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

.stage-pointer {
  pointer-events: auto;
}

.tarot-card,
.deck-layer,
.card-3d-inner {
  width: var(--card-width);
  height: var(--card-height);
}

.tarot-card {
  will-change: transform;
}

.deck-layer {
  position: relative;
}

.stack-card {
  position: absolute;
  top: 0;
  left: 0;
}

.stage-center {
  position: absolute;
  top: 50%;
  left: 50%;
}

.draw-container {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

.draw-wrapper {
  perspective: 1200px;
  position: absolute;
}

.card-3d-inner {
  transform-style: preserve-3d;
  position: relative;
}

.face-back,
.face-front {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  backface-visibility: hidden;
  margin: 0 !important;
}

.face-front {
  transform: rotateY(180deg);
}

.front-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Upright/Reversed badge */
.position-badge {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 30;
  animation: badge-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.position-badge.upright {
  background: linear-gradient(145deg, var(--color-accent-light, #f0d080), var(--color-accent, #b8943e));
}

.position-badge.reversed {
  background: linear-gradient(145deg, #8b6f5e, #5c3d2e);
}

.badge-label {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

@keyframes badge-pop-in {
  from {
    opacity: 0;
    transform: scale(0.4);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.action-footer {
  margin-top: auto;
  padding: 40rpx 20rpx calc(env(safe-area-inset-bottom, 0px) + 60rpx);
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 20;
}

.actions {
  display: flex;
  gap: 30rpx;
  align-items: center;
}

.dev-tools {
  position: absolute;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 24rpx);
  z-index: 40;
  width: 420rpx;
  max-width: calc(100vw - 48rpx);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: rgba(247, 240, 224, 0.9);
  border: 1rpx solid var(--color-border-strong);
  box-shadow: 0 12rpx 36rpx rgba(30, 15, 6, 0.16);
  backdrop-filter: blur(12px);
}

.dev-tools-title {
  font-size: 22rpx;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
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
  background: rgba(242, 232, 208, 0.96);
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

.btn {
  padding: 18rpx 40rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: linear-gradient(to bottom, #2b302a, #1a1e19);
  border-radius: 40rpx;
  border: none;
  color: #cca957;
  font-weight: bold;
}

.revealing-hint {
  color: var(--color-accent);
  letter-spacing: 0.1em;
  font-size: 28rpx;
  opacity: 0.9;
}

.thinking-dots {
  display: inline-flex;
  gap: 2rpx;
}

.thinking-dots .dot {
  display: inline-block;
  animation: dot-pulse 1.4s infinite;
}

.thinking-dots .dot-2 {
  animation-delay: 0.2s;
}

.thinking-dots .dot-3 {
  animation-delay: 0.4s;
}

@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-4rpx); }
}

/* Result zone states */
.result-loading,
.result-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  gap: var(--space-4);
}

.loading-text,
.error-text {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  text-align: center;
}

/* #ifdef H5 */
@media (min-width: 768px) {
  .divination-overlay {
    --card-width: clamp(120px, 13vw, 188px);
  }
}
/* #endif */

/* #ifdef MP-WEIXIN */
@media (min-width: 768px) {
  .divination-overlay {
    --card-width: 188px;
  }
}
/* #endif */

@keyframes oracle-breathe {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(184, 148, 62, 0.16);
  }

  50% {
    transform: scale(1.03);
    box-shadow: 0 0 18rpx rgba(184, 148, 62, 0.2);
  }
}
</style>
