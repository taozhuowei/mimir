<template>
  <!--
    AnswerInscription — the 答案 (the Answer), struck into the page directly
    beneath the drawn card. Replaces the old split / drawer / panel overlay
    stack: there is no side pane and no bottom sheet anymore — the answer
    lives in the same vertical space as the card, read like an inscription
    carved below it on aged parchment.

    Owns its own loading / error / success states (the panel host that used
    to do this was removed). On success it emits `answerRevealed` after
    the staged reveal settles so the app phase still advances reading →
    decision and ActionArea (回到首页 / 再占一次 / 重试) appears unchanged.
  -->
  <view class="answer-inscription" role="region" aria-label="答案" aria-live="polite">
    <view v-if="state === 'loading'" key="loading" class="ai-loading">
      <text class="ai-loading__word font-display">正在揭示答案</text>
      <text class="ai-loading__ellipsis" aria-hidden="true">···</text>
    </view>

    <view v-else-if="state === 'error'" key="error" class="ai-error">
      <text class="ai-error__text font-body">{{ errorMessage || '答案暂时不可用，请稍后重试' }}</text>
    </view>

    <view v-else-if="state === 'success' && answer" key="success" class="ai-body">
      <text class="ai-quote font-display">{{ answer.quote }}</text>
      <view class="ai-rule" aria-hidden="true"></view>
      <text class="ai-translation font-body">{{ answer.translation }}</text>
      <text class="ai-source font-body">—— {{ answer.source }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: AnswerInscription
 * Purpose: the single component that presents the Answer below the card,
 *          owning loading / error / success itself.
 * Reason: the panel + split + drawer overlay was removed; the answer is now
 *          inline under the card, so its state machine and reveal timing
 *          live here rather than in a deleted host.
 * Data flow: MainSurface passes `state` (reading request status),
 *          `answerResult`, `errorMessage`. single_card is the only spread,
 *          so the Answer is `cardDetails[0]`. Emits `answerRevealed`
 *          once the success reveal settles → use_main_stage.enterDecision().
 */
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { prefersReducedMotion } from '../../../core/utils/accessibility'
import type { AnswerResult } from '../../../core/api/types'

type RequestState = 'idle' | 'loading' | 'success' | 'error'

const props = defineProps<{
  state: RequestState
  answerResult: AnswerResult | null
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'answerRevealed'): void
}>()

const answer = computed(() => props.answerResult?.cardDetails[0]?.answer ?? null)

// Staged-reveal total: source line starts at 460ms, its rise is 560ms;
// +90ms so the completion signal fires after the last glyph has fully
// committed on slow devices. Mirrors the timing contract the deleted
// ReadingTextContainer/AnswerCard used to advance reading → decision.
const REVEAL_TOTAL_MS = 460 + 560 + 90

let completionTimer: ReturnType<typeof setTimeout> | null = null

function clearTimer(): void {
  if (completionTimer !== null) {
    clearTimeout(completionTimer)
    completionTimer = null
  }
}

function signalWhenRevealed(): void {
  clearTimer()
  if (props.state !== 'success' || !answer.value) return
  const delay = prefersReducedMotion() ? 0 : REVEAL_TOTAL_MS
  completionTimer = setTimeout(() => emit('answerRevealed'), delay)
}

onMounted(signalWhenRevealed)
// Success can arrive after mount (loading → success), so re-arm on entry.
watch(() => props.state, signalWhenRevealed)
onUnmounted(clearTimer)
</script>

<style scoped>
/* 所有 px 数值按 iPhone 14 Pro Max 设计稿真值书写。
   postcss-pxtorem 编译期转 rem，design_flexible 运行时按视口宽度 clamp
   到 [0.872, 1] × 43px 的 root font-size，实现等比缩放。
   max-width 使用 px 而非 em，避免大字号下二次膨胀溢出 canvas。
   详见 docs/research/layout_final_rem.md。 */
.answer-inscription {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  padding: 0 20px;
}

/* ---- success: the inscription ------------------------------------- */
.ai-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 原文：display face，整段视觉重心。最大宽度按 14PM 上 quote 28px ×
   ~13 字符宽，保证长行在 canvas 内自然折行而不撑出。 */
.ai-quote {
  max-width: 360px;
  color: var(--color-text-primary);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.26;
  letter-spacing: 0.005em;
  margin-top: 24px;
  animation: ai-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* hairline rule — 短中线分隔，1px 边框由 postcss-pxtorem 配置
   propList 排除，保持物理像素不参与缩放（防 subpixel 失真）。 */
.ai-rule {
  width: 40px;
  height: 1px;
  margin: 16px 0 12px;
  background: var(--color-border-accent);
  animation: ai-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
}

/* 翻译：含义层，line-height 略宽给浅色字配色更易读。 */
.ai-translation {
  max-width: 320px;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.74;
  letter-spacing: 0.01em;
  animation: ai-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both;
}

/* 来源：题款，最细最轻。 */
.ai-source {
  max-width: 280px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-style: italic;
  line-height: 1.6;
  letter-spacing: 0.06em;
  margin-top: 16px;
  animation: ai-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) 460ms both;
}

@keyframes ai-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- loading: a breathing line, no generic spinner ---------------- */
.ai-loading {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
}

.ai-loading__word {
  color: var(--color-text-muted);
  font-size: 16px;
  letter-spacing: 0.16em;
}

.ai-loading__ellipsis {
  color: var(--color-accent);
  font-size: 16px;
  letter-spacing: 0.12em;
  animation: ai-breathe 1.6s ease-in-out infinite;
}

@keyframes ai-breathe {
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 1; }
}

/* ---- error: a quiet line; recovery lives in ActionArea ------------ */
.ai-error {
  padding: 32px 0;
}

.ai-error__text {
  color: var(--color-yes);
  font-size: 14px;
  line-height: 1.7;
}

@media (prefers-reduced-motion: reduce) {
  .ai-quote,
  .ai-rule,
  .ai-translation,
  .ai-source,
  .ai-loading__ellipsis {
    animation: none !important;
  }
}
</style>
