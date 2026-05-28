<template>
  <!--
    AnswerCard — the 答案卡 (PRD 容器 #5), struck into the page directly
    beneath the result card. The terminal `answer` flow mounts this card
    and ActionArea together; the staged rise-in is purely decorative.
    Mounts as a direct flex item of .main-surface__body — there is no
    .answer-zone wrapper. The min-height + entry animation live on this
    root so layout solver `answerZoneMinHeight` and the DOM box agree.
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
/* 字号 / 行高 / 字距统一走 CSS 变量（--font-* / --leading-* / --tracking-*），
   由 sizes 桥按 `deriveFontScale(canvasWidth) = clamp(0.8721, w/430, 1)`
   派生，与 design_flexible 同源；PostCSS pxtorem 链已黑名单这三类属性。
   非字号 px（margin / padding / max-width）仍走 pxtorem，按视口等比缩。
   本组件即为 .main-surface__body 的 flex item（无外包装），
   `flex: 0 0 auto` 不被弹性挤压；min-height 用 layout solver 同源的
   --answer-zone-min-height；超长答案沿 overflow-y:auto 内滚；
   上限 50% 防止极端文案吃掉 stage。 */
.answer-card {
  flex: 0 0 auto;
  min-height: var(--answer-zone-min-height);
  max-height: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  /* 底部 9px 缓冲吸收 rise-in 的 translateY(8px)（见 answer-card-rise）：
     入场时最底部的 .answer-card__source 下移 8px，若无缓冲会越过滚动容器
     content box 底沿、撑出 overflow-y 的可滚区，瞬间闪出滚动条；预留 9px
     padding（8px 位移 + 1px 亚像素余量）让该位移落在 padding 区内（可见、
     不裁切、不可滚），动画结束归位。超长答案仍由 max-height + overflow-y
     正常滚动。 */
  padding: 0 20px 9px;
  overflow-y: auto;
  animation: answer-card-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes answer-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
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
  font-size: var(--font-xl);
  font-weight: 600;
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
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
  font-size: var(--font-s);
  line-height: var(--leading-loose);
  letter-spacing: var(--tracking-tight);
  animation: answer-card-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both;
}

/* 来源。 */
.answer-card__source {
  max-width: 280px;
  color: var(--color-text-muted);
  font-size: var(--font-xxs);
  font-style: italic;
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-normal);
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
  font-size: var(--font-s);
  letter-spacing: var(--tracking-wider);
}

.answer-card__loading-ellipsis {
  color: var(--color-accent);
  font-size: var(--font-s);
  letter-spacing: var(--tracking-wide);
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
  font-size: var(--font-xs);
  line-height: var(--leading-loose);
}

@media (prefers-reduced-motion: reduce) {
  .answer-card,
  .answer-card__quote,
  .answer-card__rule,
  .answer-card__translation,
  .answer-card__source,
  .answer-card__loading-ellipsis {
    animation: none !important;
  }
}
</style>
