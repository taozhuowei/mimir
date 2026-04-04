<template>
  <!-- 
    结果面板组件
    展示占卜结果：结论句 + 打字机摘要 + 3张牌详情
    牌阵展示由 DivinationOverlay 负责，本组件仅负责解读内容
  -->
  <view class="reading-panel" data-testid="result-shell">
    <view class="result-hero card border-brass" data-testid="result-hero">
      <view class="hero-copy">
        <text class="eyebrow font-display text-sm">占卜结果</text>
        <text class="hero-title font-display text-3xl" data-testid="result-statement">
          {{ resultStatement }}
        </text>

        <text v-if="question" class="question text-base" data-testid="result-question">"{{ question }}"</text>
      </view>
    </view>

    <!-- 牌义解读列表：遍历3张牌，展示位置徽章+牌名+含义 -->
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
            <!-- 位置序号徽章 -->
            <view class="meaning-number font-display">{{ index + 1 }}</view>
            <view class="meaning-title">
              <!-- 中英文牌名 -->
              <view class="card-name-row">
                <text class="meaning-card-name font-body">{{ detail.card.name }}</text>
                <text class="meaning-card-name-en font-display">{{ detail.card.nameEn }}</text>
              </view>
              <!-- 正逆位 + 大/小阿卡纳 -->
              <view class="meaning-meta-row">
                <text class="meaning-position text-sm">
                  {{ detail.position === 'upright' ? '正位' : '逆位' }}
                </text>
                <text class="meaning-arcana text-sm">
                  {{ detail.card.type === 'major' ? '大阿卡纳' : '小阿卡纳' }}
                </text>
              </view>
            </view>
          </view>
          <!-- 关键词标签 -->
          <view class="keywords-row">
            <text
              v-for="kw in (detail.position === 'upright' ? detail.card.upright.keywords : detail.card.reversed.keywords)"
              :key="kw"
              class="keyword-chip text-sm"
            >{{ kw }}</text>
          </view>
          <!-- 牌义解读文本 -->
          <text class="meaning-text text-base">{{ detail.meaning }}</text>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReadingResult } from '../utils/tarotReading'
import { getResultStatement } from '../utils/result_panel'

/**
 * Props 定义
 * @property readingResult - 占卜结果数据，包含3张牌详情和整体结论
 * @property question - 用户提问（可选），用于回显
 */
const props = defineProps<{
  readingResult: ReadingResult
  question?: string
}>()

/**
 * Emits 定义
 * @event restart - 用户点击"再占一次"时触发，父组件应重置状态回到初始页
 */
defineEmits<{
  (event: 'restart'): void
}>()

// 从结果数据计算结论句（Yes/No/Mixed 对应的文案）
const resultStatement = computed(() => getResultStatement(props.readingResult.result))
</script>

<style scoped>
.reading-panel {
  padding: var(--space-6) var(--space-5) calc(env(safe-area-inset-bottom, 0px) + var(--space-10));
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: 720px;
  width: 100%;
  box-sizing: border-box;
}

.result-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-8) var(--space-6);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  background:
    radial-gradient(ellipse at top right, rgba(122, 92, 20, 0.08), transparent 60%),
    var(--color-card-bg);
  border: 1rpx solid var(--color-border-strong);
  animation: rise-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* #ifdef H5 */
.result-hero {
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}
/* #endif */

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  text-align: center;
}

.eyebrow {
  color: var(--color-accent);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-title {
  color: var(--color-text-primary);
  line-height: 1.1;
  text-shadow: 0 2rpx 10rpx rgba(74, 52, 40, 0.1);
  margin: var(--space-2) 0;
}

.question {
  padding-top: var(--space-2);
  font-style: italic;
  color: var(--color-text-tertiary);
}

.interpretation-section {
  padding: var(--space-6) var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-card-bg);
  box-shadow: var(--shadow-md);
  border: 1rpx solid var(--color-border);
  animation: rise-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms both;
}

/* #ifdef H5 */
.interpretation-section {
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
}
/* #endif */

.section-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.section-title {
  color: var(--color-text-primary);
  letter-spacing: 0.12em;
  font-size: var(--text-xl);
}

.divider-line {
  width: 120rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.meaning-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.meaning-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5) 0;
  border-bottom: 1rpx solid var(--color-border-rule);
}

.meaning-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.meaning-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.meaning-number {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-bg-primary);
  background: linear-gradient(145deg, var(--color-accent), var(--color-accent-dark));
  box-shadow: 0 4rpx 12rpx rgba(122, 92, 20, 0.25);
  flex-shrink: 0;
  font-size: var(--text-sm);
}

.meaning-title {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.card-name-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
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
}

.meaning-meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

/* #ifdef MP-WEIXIN */
/* 小程序使用额外的text元素替代::before */
.meaning-arcana-separator {
  margin-right: var(--space-2);
  opacity: 0.4;
}
/* #endif */

.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.keyword-chip {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(184, 148, 62, 0.08);
  border: 1rpx solid rgba(184, 148, 62, 0.25);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  letter-spacing: 0.03em;
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
