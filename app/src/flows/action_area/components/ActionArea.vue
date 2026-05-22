<template>
  <!--
    ActionArea — terminal-flow action surface.
    Per docs/prd/glossary.md 容器 #8 + docs/prd/animation.md 动效规范 #3,
    the action area only renders in the `answer` flow. On success it
    surfaces 回到首页 / 再占一次; on a failed reading it swaps the primary
    CTA to 重试读取. The fade-in animation is synchronised with the
    sibling answer zone (same 480ms ease curve + 8px translateY).
  -->
  <view
    v-if="visible"
    class="action-area"
    role="toolbar"
    aria-label="占卜操作"
  >
    <template v-if="!isAnswerFailed">
      <view
        class="btn btn-secondary"
        role="button"
        tabindex="0"
        aria-label="回到首页"
        @click="$emit('backHome')"
        @keydown.enter="$emit('backHome')"
        @keydown.space.prevent="$emit('backHome')"
      >回到首页</view>
      <view
        class="btn btn-primary"
        role="button"
        tabindex="0"
        aria-label="再占一次"
        @click="$emit('restart')"
        @keydown.enter="$emit('restart')"
        @keydown.space.prevent="$emit('restart')"
      >再占一次</view>
    </template>

    <template v-else>
      <view
        class="btn btn-primary"
        role="button"
        tabindex="0"
        aria-label="重试读取"
        @click="$emit('retry')"
        @keydown.enter="$emit('retry')"
        @keydown.space.prevent="$emit('retry')"
      >重试读取</view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: ActionArea container
 * Purpose: hosts the restart / back-home / retry buttons; mounted only in
 *          the terminal `answer` flow (docs/prd/state.md 应用级流程).
 * Reason: keeping the visibility rule colocated with the container removes
 *         one source of flow coupling from views and makes the rule
 *         auditable in a single file.
 * Data flow: parent view passes the current `Flow` and reading state;
 *           this container emits semantic actions that the page
 *           translates into store transitions.
 */
import { computed } from 'vue'
import type { Flow } from '../../../core/store/slices/flow'

const props = defineProps<{
  flow: Flow
  isAnswerFailed?: boolean
}>()

defineEmits<{
  (event: 'restart'): void
  (event: 'backHome'): void
  (event: 'retry'): void
}>()

/**
 * Visibility rule (docs/prd/glossary.md 容器 #8): show only in the terminal
 * `answer` flow. When the reading itself failed the buttons swap to a
 * retry CTA; in every other flow the area stays hidden.
 */
const visible = computed(() => props.flow === 'answer')
</script>

<style scoped>
.action-area {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 12px 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
  /* 与 .answer-card 同步：480ms cubic-bezier(0.16,1,0.3,1) 淡入 +
     8px translateY，确保进入 `answer` flow 时答案卡与操作区在同一帧
     视觉上同时显现（docs/prd/animation.md 动效规范）。 */
  animation: action-area-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

/*
 * Local overrides for the global `.btn` utility — scoped to .action-area so
 * other future consumers of `.btn` are not affected.
 *
 * 全局 .btn 用 var(--space-3) var(--space-6) = 0.75rem / 1.5rem，在 rem
 * 自适应链下 rootFontSize=43（14PM）时实测 32.25×64.5px、按钮高 83~87px，
 * 远超移动端触控按钮的合理比例（44px 触控基线、字号 14px 的 ~2.7 倍盒）。
 *
 * 改用 px 字面量后 padding 不参与 rem 缩放，结合显式 line-height 锁定盒高，
 * 14PM 视口下高度收敛到 ~40px、宽度自然贴文：14×1.4 + 10×2 ≈ 40，含
 * letter-spacing 实际略大于 44px 触控基线。border-radius 999px 同样改字面量
 * 避免 9999rpx 经 rem 链放大成 13436px。
 */
.action-area .btn {
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.06em;
}

@keyframes action-area-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-area {
    animation: none !important;
  }
}
</style>
