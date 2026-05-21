<template>
  <!--
    AnswerCard — the 答案卡 (PRD 容器 #5), struck into the page directly
    beneath the result card. The terminal `answer` flow mounts this card
    and ActionArea together; the staged rise-in is purely decorative.
  -->
  <view class="answer-card" role="region" aria-label="答案" aria-live="polite">
    <view v-if="state === 'loading'" key="loading" class="answer-card__loading">
      <text class="answer-card__loading-word font-display">正在揭示答案</text>
      <text class="answer-card__loading-ellipsis" aria-hidden="true">···</text>
    </view>

    <view v-else-if="state === 'error'" key="error" class="answer-card__error">
      <text class="answer-card__error-text font-body">{{ errorMessage || '答案暂时不可用，请稍后重试' }}</text>
    </view>

    <view v-else-if="state === 'success' && answer" key="success" class="answer-card__body">
      <text class="answer-card__quote font-display">{{ answer.quote }}</text>
      <view class="answer-card__rule" aria-hidden="true"></view>
      <text class="answer-card__translation font-body">{{ answer.translation }}</text>
      <text class="answer-card__source font-body">—— {{ answer.source }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: AnswerCard (PRD glossary 容器 #5)
 * Purpose: the single component that presents the Answer below the
 *          result card, owning loading / error / success.
 * Reason: PRD names this container AnswerCard; the previous
 *          AnswerInscription class hierarchy (.ai-*) drifted from the
 *          domain term. No state-machine emission is needed — the
 *          terminal `answer` flow already mounts this card alongside
 *          ActionArea, so the rise-in cascade is purely visual.
 * Data flow: MainSurface passes `state` (reading request status),
 *          `answerResult`, `errorMessage`. single_card is the only spread,
 *          so the Answer is `cardDetails[0]`.
 */
import { computed } from 'vue'
import type { AnswerResult } from '../../../core/api/types'

type RequestState = 'idle' | 'loading' | 'success' | 'error'

const props = defineProps<{
  state: RequestState
  answerResult: AnswerResult | null
  errorMessage?: string
}>()

const answer = computed(() => props.answerResult?.cardDetails[0]?.answer ?? null)
</script>

<style scoped>
/* 所有 px 数值按 iPhone 14 Pro Max 设计稿真值书写。
   postcss-pxtorem 编译期转 rem，design_flexible 运行时按视口宽度 clamp
   到 [0.872, 1] × 43px 的 root font-size，实现等比缩放。
   max-width 使用 px 而非 em，避免大字号下二次膨胀溢出 canvas。
   详见 docs/research/layout_final_rem.md。 */
.answer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0 20px;
  overflow-y: auto;
}

/* ---- success ------------------------------------------------------ */
.answer-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 原文：display face，整段视觉重心。 */
.answer-card__quote {
  max-width: 360px;
  color: var(--color-text-primary);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.26;
  letter-spacing: 0.005em;
  margin-top: 24px;
  animation: answer-card-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* hairline rule — 短中线分隔，1px 不参与 rem 缩放（subpixel 失真防护）。 */
.answer-card__rule {
  width: 40px;
  height: 1px;
  margin: 16px 0 12px;
  background: var(--color-border-accent);
  animation: answer-card-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
}

/* 翻译。 */
.answer-card__translation {
  max-width: 320px;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.74;
  letter-spacing: 0.01em;
  animation: answer-card-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both;
}

/* 来源。 */
.answer-card__source {
  max-width: 280px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-style: italic;
  line-height: 1.6;
  letter-spacing: 0.06em;
  margin-top: 16px;
  animation: answer-card-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 460ms both;
}

@keyframes answer-card-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- loading ------------------------------------------------------ */
.answer-card__loading {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
}

.answer-card__loading-word {
  color: var(--color-text-muted);
  font-size: 16px;
  letter-spacing: 0.16em;
}

.answer-card__loading-ellipsis {
  color: var(--color-accent);
  font-size: 16px;
  letter-spacing: 0.12em;
  animation: answer-card-breathe 1.6s ease-in-out infinite;
}

@keyframes answer-card-breathe {
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 1; }
}

/* ---- error -------------------------------------------------------- */
.answer-card__error {
  padding: 32px 0;
}

.answer-card__error-text {
  color: var(--color-yes);
  font-size: 14px;
  line-height: 1.7;
}

@media (prefers-reduced-motion: reduce) {
  .answer-card__quote,
  .answer-card__rule,
  .answer-card__translation,
  .answer-card__source,
  .answer-card__loading-ellipsis {
    animation: none !important;
  }
}
</style>
