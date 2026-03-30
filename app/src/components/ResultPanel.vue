<template>
  <scroll-view class="result-shell" scroll-y enable-flex data-testid="result-shell">
    <view class="result-container">
      <view class="result-hero card border-brass" data-testid="result-hero">
        <view class="hero-copy">
          <text class="eyebrow font-display text-sm">占卜结果</text>
          <text class="hero-title font-display text-3xl" data-testid="result-statement">
            {{ resultStatement }}
          </text>

          <text class="hero-subtitle text-base" data-testid="result-summary">
            {{ typedSummary }}<text class="typing-caret" :class="{ hidden: !isTyping }">|</text>
          </text>

          <text v-if="question" class="question text-base" data-testid="result-question">“{{ question }}”</text>
        </view>
      </view>

      <view class="result-grid">
        <view class="cards-section card" data-testid="result-cards-section">
          <view class="section-header">
            <text class="section-title font-display text-lg">牌阵</text>
            <view class="divider-line"></view>
          </view>

          <view class="cards-row" data-testid="result-card-grid">
            <view
              v-for="(detail, index) in readingResult.cardDetails"
              :key="`${detail.card.name}-${index}`"
              class="card-item"
              data-testid="result-card-item"
            >
              <view class="card-visual">
                <view
                  class="card-image-wrapper"
                  data-testid="result-card-visual"
                  :style="{ '--stagger-delay': `${index * 160}ms` }"
                >
                  <view class="card-image-flip">
                    <image class="card-face card-back" :src="cardBack" mode="aspectFill" />
                    <image
                      class="card-face card-front"
                      :src="detail.card.image"
                      :class="{ reversed: detail.position === 'reversed' }"
                      mode="aspectFit"
                    />
                  </view>

                  <view class="position-badge" :class="detail.position">
                    <text class="badge-label font-display">{{ detail.position === 'upright' ? '正' : '逆' }}</text>
                  </view>
                </view>
              </view>

              <view class="card-copy">
                <text class="card-order font-display text-sm">第 {{ index + 1 }} 张</text>
                <text class="card-name font-body text-base">{{ detail.card.name }}</text>
                <text class="card-position text-sm">
                  {{ detail.position === 'upright' ? '正位启示' : '逆位启示' }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view class="interpretation-section card">
          <view class="section-header">
            <text class="section-title font-display text-lg">牌义解读</text>
            <view class="divider-line"></view>
          </view>

          <view class="meaning-list">
            <view
              v-for="(detail, index) in readingResult.cardDetails"
              :key="`${detail.card.name}-${detail.position}-${index}`"
              class="meaning-item"
            >
              <view class="meaning-header">
                <view class="meaning-number font-display">{{ index + 1 }}</view>
                <view class="meaning-title">
                  <text class="meaning-card-name font-body text-base">{{ detail.card.name }}</text>
                  <text class="meaning-position text-sm">
                    {{ detail.position === 'upright' ? '正位启示' : '逆位启示' }}
                  </text>
                </view>
              </view>
              <text class="meaning-text text-base">{{ detail.meaning }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="action-section">
        <view class="restart-btn btn btn-primary" data-testid="restart-button" @click="$emit('restart')">
          <text class="btn-text">再占一次</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import type { ReadingResult } from '../utils/tarotReading'
import { getResultStatement, getSummaryText } from '../utils/result_panel'

const props = defineProps<{
  readingResult: ReadingResult
  question?: string
}>()

defineEmits<{
  (event: 'restart'): void
}>()

const userStore = useUserStore()
const cardBack = computed(() => userStore.cardBackImage || '/static/themes/golden_dawn/tarot/card_back.jpeg')

const resultStatement = computed(() => getResultStatement(props.readingResult.result))
const summaryText = computed(() => getSummaryText(props.readingResult))

const typedSummary = ref('')
const isTyping = ref(false)
let typingTimer: ReturnType<typeof setInterval> | null = null

function stopTyping() {
  if (typingTimer) {
    clearInterval(typingTimer)
    typingTimer = null
  }
}

function startTyping(text: string) {
  stopTyping()
  typedSummary.value = ''
  isTyping.value = true

  let index = 0
  typingTimer = setInterval(() => {
    index += 1
    typedSummary.value = text.slice(0, index)

    if (index >= text.length) {
      stopTyping()
      isTyping.value = false
    }
  }, 30)
}

watch(summaryText, (text) => {
  startTyping(text)
}, { immediate: true })

onMounted(() => {
  startTyping(summaryText.value)
})

onBeforeUnmount(() => {
  stopTyping()
})
</script>

<style scoped>
.result-shell {
  width: 100%;
  height: 100vh;
  z-index: 10;
}

.result-container {
  width: min(100%, 1200px);
  margin: 0 auto;
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-6)) var(--space-5)
    calc(env(safe-area-inset-bottom, 0px) + var(--space-8));
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.result-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
  background:
    radial-gradient(circle at top left, rgba(212, 184, 114, 0.18), transparent 40%),
    var(--color-card-bg);
  animation: rise-in 420ms ease;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.eyebrow {
  color: var(--color-accent);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-title {
  color: var(--color-text-primary);
  line-height: 1.05;
  max-width: 100%;
}

.hero-subtitle,
.question {
  color: var(--color-text-secondary);
}

.question {
  padding-top: var(--space-1);
  font-style: italic;
}

.typing-caret {
  display: inline-block;
  margin-left: 4rpx;
  animation: caret-blink 0.9s steps(1) infinite;
}

.typing-caret.hidden {
  opacity: 0;
}

.result-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.cards-section,
.interpretation-section {
  padding: var(--space-6);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.section-title {
  color: var(--color-text-primary);
  letter-spacing: 0.12em;
}

.divider-line {
  width: 72rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.cards-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(245, 230, 200, 0.24);
  min-width: 0;
}

.card-visual {
  width: 100%;
  display: flex;
  justify-content: center;
}

.card-image-wrapper {
  --stagger-delay: 0ms;
  --result-card-max-width: clamp(120px, 16vw, 184px);

  position: relative;
  width: min(100%, var(--result-card-max-width));
  aspect-ratio: 5 / 8;
  border-radius: var(--radius-md);
  perspective: 1200px;
}

.card-image-flip {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  transform-style: preserve-3d;
  animation: result-card-flip 860ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(180ms + var(--stagger-delay));
}

.card-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  border: 2rpx solid var(--color-border);
  box-shadow: var(--shadow-lg);
  backface-visibility: hidden;
}

.card-back {
  object-fit: cover;
}

.card-front {
  transform: rotateY(180deg);
}

.card-front.reversed {
  transform: rotateY(180deg) rotate(180deg);
}

.position-badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  z-index: 2;
}

.position-badge.upright {
  background: linear-gradient(145deg, var(--color-accent-light), var(--color-accent));
}

.position-badge.reversed {
  background: linear-gradient(145deg, #8b6f5e, #5c3d2e);
}

.badge-label {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

.card-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  text-align: center;
}

.card-order {
  color: var(--color-accent);
  letter-spacing: 0.08em;
}

.card-name {
  color: var(--color-text-primary);
  font-weight: 600;
}

.card-position {
  color: var(--color-text-secondary);
}

.meaning-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.meaning-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(245, 230, 200, 0.24);
  border-left: 3rpx solid var(--color-accent);
}

.meaning-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.meaning-number {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(145deg, var(--color-accent), var(--color-accent-dark));
}

.meaning-title {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.meaning-card-name {
  color: var(--color-text-primary);
  font-weight: 600;
}

.meaning-position {
  color: var(--color-text-tertiary);
}

.meaning-text {
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.action-section {
  display: flex;
  justify-content: center;
  padding-bottom: var(--space-4);
}

.restart-btn {
  min-width: 280rpx;
  height: 96rpx;
}

@media (min-width: 768px) {
  .result-container {
    padding-left: var(--space-8);
    padding-right: var(--space-8);
    gap: var(--space-8);
  }
}

@media (max-width: 767px) {
  .cards-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .card-item {
    padding: var(--space-3);
    gap: var(--space-3);
  }

  .card-image-wrapper {
    --result-card-max-width: clamp(88px, 24vw, 128px);
  }

  .card-name,
  .card-position {
    font-size: var(--text-sm);
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes caret-blink {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}

@keyframes result-card-flip {
  from {
    transform: rotateY(0deg);
  }

  to {
    transform: rotateY(180deg);
  }
}
</style>
