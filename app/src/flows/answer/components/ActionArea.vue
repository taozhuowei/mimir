<template>
  <!--
    ActionArea — phase-2.2.b implementation.
    Per docs/prd/glossary.md（容器 #8）and docs/prd/animation.md（动效规范 #3）the action area only renders during the
    `decision` phase or when the reading request failed. Real buttons
    migrated from ActionBar.vue with 350ms fade-in animation.
  -->
  <view
    v-if="visible"
    class="action-area"
    role="toolbar"
    aria-label="占卜操作"
  >
    <template v-if="phase === 'decision'">
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

    <template v-else-if="isAnswerFailed">
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
 * Purpose: hosts the restart / back-home / retry buttons; only mounted in
 *          the `decision` phase or while the reading request is in error
 *          state (per docs/prd/state.md（决策阶段的出口）). Migrated from ActionBar.vue.
 * Reason: keeping the visibility rule colocated with the container removes
 *         one source of phase coupling from views and makes the rule
 *         auditable in a single file.
 * Data flow: parent view passes the current `DivinationPhase` and reading
 *           state; this container emits semantic actions that the page
 *           translates into store transitions.
 */
import { computed } from 'vue'
import type { DivinationPhase } from '../../../core/store/slices/flow'

const props = defineProps<{
  phase: DivinationPhase
  isAnswerFailed?: boolean
}>()

defineEmits<{
  (event: 'restart'): void
  (event: 'backHome'): void
  (event: 'retry'): void
}>()

/**
 * Visibility rule (docs/prd/glossary.md（容器 #8）): show only during `decision`, OR when the
 * reading itself failed (the retry affordance must be reachable mid-reading
 * if the request errored). All other phases hide the area entirely.
 */
const visible = computed(() =>
  props.phase === 'decision' || props.isAnswerFailed === true,
)
</script>

<style scoped>
.action-area {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 12px 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
  /* 350ms fade-in per docs/prd/animation.md（动效规范 #3） */
  animation: action-fade-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
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

@keyframes action-fade-in {
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
