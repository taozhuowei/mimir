<template>
  <view class="reading-panel" :class="result_tone_class" data-testid="result-shell">
    <view class="result-hero" data-testid="result-hero">
      <TypewriterText
        class="eyebrow font-display text-sm"
        text="占卜结果"
        :start-delay="40"
        :char-interval="44"
      />
      <TypewriterText
        class="hero-title font-display text-3xl"
        :class="result_tone_class"
        :text="result_statement"
        :start-delay="180"
        :char-interval="38"
        data-testid="result-statement"
      />
      <TypewriterText
        v-if="question"
        class="question text-base"
        :text="`“${question}”`"
        :start-delay="420"
        :char-interval="26"
        data-testid="result-question"
      />
    </view>

    <view class="meaning-list">
      <view
        v-for="(detail, index) in readingResult.cardDetails"
        :key="`${detail.card.name}-${detail.position}-${index}`"
        class="meaning-item"
      >
        <TypewriterText
          class="meaning-card-name font-body"
          :text="detail.card.name"
          :start-delay="getFieldDelay(index, 0)"
          :char-interval="24"
        />
        <TypewriterText
          class="meaning-card-name-en font-display"
          :text="detail.card.nameEn"
          :start-delay="getFieldDelay(index, 1)"
          :char-interval="18"
        />

        <view class="meaning-meta-row">
          <TypewriterText
            class="meaning-position text-sm"
            :text="detail.position === 'upright' ? '正位' : '逆位'"
            :start-delay="getFieldDelay(index, 2)"
            :char-interval="52"
          />
          <TypewriterText
            class="meaning-arcana text-sm"
            :text="detail.card.type === 'major' ? '大阿尔卡那' : '小阿尔卡那'"
            :start-delay="getFieldDelay(index, 3)"
            :char-interval="28"
          />
        </view>

        <view class="keywords-row">
          <view
            v-for="(keyword, keyword_index) in getKeywords(detail)"
            :key="`${detail.card.id}-${detail.position}-${keyword}`"
            class="keyword-chip text-sm"
          >
            <TypewriterText
              class="keyword-chip-text"
              :text="keyword"
              :start-delay="getKeywordDelay(index, keyword_index)"
              :char-interval="20"
            />
          </view>
        </view>

        <TypewriterText
          class="meaning-text text-base"
          :text="detail.meaning"
          :start-delay="getFieldDelay(index, 4)"
          :char-interval="16"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TypewriterText from './TypewriterText.vue'
import type { ReadingResult } from '../utils/tarotReading'
import { getResultStatement } from '../utils/result_panel'

const props = defineProps<{
  readingResult: ReadingResult
  question?: string
}>()

defineEmits<{
  (event: 'restart'): void
}>()

const result_statement = computed(() => getResultStatement(props.readingResult.result))
const result_tone_class = computed(() =>
  props.readingResult.result === 'positive' ? 'is-positive' : 'is-negative'
)

function getKeywords(detail: ReadingResult['cardDetails'][number]): string[] {
  return detail.position === 'upright'
    ? detail.card.upright.keywords
    : detail.card.reversed.keywords
}

function getFieldDelay(index: number, step: number): number {
  return 620 + index * 320 + step * 90
}

function getKeywordDelay(index: number, keyword_index: number): number {
  return getFieldDelay(index, 3) + 90 + keyword_index * 70
}
</script>

<style scoped>
.reading-panel {
  --result-tone: var(--color-accent);
  --result-tone-bg: rgba(122, 92, 20, 0.08);

  padding: var(--space-6) var(--space-5) calc(env(safe-area-inset-bottom, 0px) + var(--space-10));
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: 720px;
  width: 100%;
  box-sizing: border-box;
}

.reading-panel.is-positive {
  --result-tone: var(--color-yes);
  --result-tone-bg: var(--color-yes-bg);
}

.reading-panel.is-negative {
  --result-tone: var(--color-no);
  --result-tone-bg: var(--color-no-bg);
}

.result-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  text-align: center;
  animation: rise-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.eyebrow {
  color: var(--result-tone);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: var(--text-sm);
}

.hero-title {
  color: var(--result-tone);
  line-height: 1.1;
  text-shadow: 0 2rpx 10rpx rgba(74, 52, 40, 0.1);
  margin: var(--space-2) 0;
}

.question {
  padding-top: var(--space-2);
  font-style: italic;
  color: var(--color-text-tertiary);
}

.meaning-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  animation: rise-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms both;
}

.meaning-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-5) 0;
  border-bottom: 1rpx solid var(--color-border-rule);
}

.meaning-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.meaning-card-name {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--text-lg);
}

.meaning-card-name-en {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  letter-spacing: 0.06em;
  margin-left: var(--space-2);
}

.meaning-meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.meaning-position {
  color: var(--color-accent);
  font-size: var(--text-sm);
  letter-spacing: 0.05em;
}

.meaning-arcana {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* #ifdef H5 */
.meaning-arcana::before {
  content: '·';
  margin-right: var(--space-2);
  opacity: 0.4;
}
/* #endif */

.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.keyword-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  background: var(--result-tone-bg);
  border: 1rpx solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  letter-spacing: 0.03em;
}

.keyword-chip-text {
  color: var(--color-text-secondary);
}

.meaning-text {
  color: var(--color-text-secondary);
  line-height: 1.8;
  margin-top: var(--space-2);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(32rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
