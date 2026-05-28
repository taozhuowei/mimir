<template>
  <!--
    Main divination surface (docs/glossary.md 路由 #1). Composes the
    divination surface — HeaderArea (TitleContent ↔ ProgressContent by
    flow) + Stage (CardsLoadError | StageDeck) — with the inline
    AnswerCard + ActionArea struck below the result card in the
    terminal `answer` flow; no split / drawer / side panel and no extra
    wrapper around AnswerCard (the card is itself the flex item).
    NotificationHost sits on the surface root for cross-view alerts. The
    .main-surface__canvas wrapper caps the divination canvas at
    MAX_CANVAS_WIDTH (docs/animation.md 视图过渡动画), centered. The
    single StageDeck instance stays mounted across idle ↔ divination, so
    the swap is a header-content change only. Mounted by pages/index.vue
    only when bootstrap is 'ok' (the LoadingView is its
    mutually-exclusive sibling for pending + failed states) — so
    useMainStage is never constructed in the failed state.
  -->
  <view
    class="main-surface"
    :style="cssVarStyle"
  >
    <view class="main-surface__canvas">
      <!--
        Header presentation comes from useHeaderPresentation. The idle
        card-load error band is its own component, gated by v-if/v-else
        against StageDeck so StageDeck is not mounted while erroring at idle.
      -->
      <view
        class="main-surface__body"
        :class="{
          'main-surface__body--error': isIdle && cardsLoadError,
          'main-surface__body--with-answer': showAnswer,
        }"
      >
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
        <AnswerCard
          v-if="showAnswer"
          :state="answerPanelState"
          :answer-result="answerResult"
          :error-message="answerErrorMessage"
        />
        <ActionArea
          v-if="showAnswer"
          :flow="flow"
          :is-answer-failed="answerPanelState === 'error'"
          @restart="handleRestart"
          @back-home="handleBackHome"
          @retry="handleRetry"
        />
      </view>
    </view>

    <TooSmallBanner />
    <NotificationHost />
  </view>
</template>

<script setup lang="ts">
/**
 * Name: flows/base/components/MainSurface
 * Purpose: the main divination surface. Instantiates the orchestration
 *          graph via useMainStage, provides flow / isWide / the two
 *          controllers to descendant components, derives header
 *          presentation + the idle card-load error, and composes the
 *          divination surface (HeaderArea + Stage(StageDeck)) with the
 *          inline answer zone (AnswerCard + ActionArea) and
 *          notifications.
 * Reason: extracted out of pages/index.vue so that page is a pure
 *         boot shell — it mounts this surface only when bootstrap status
 *         is 'ok', and the LoadingView otherwise (covering pending +
 *         failed states), so useMainStage is never constructed in the
 *         failed state.
 */
import { provide } from 'vue'
import HeaderArea from './HeaderArea.vue'
import TitleContent from './TitleContent.vue'
import Stage from './Stage.vue'
import StageDeck from './StageDeck.vue'
import NotificationHost from './NotificationHost.vue'
import TooSmallBanner from './TooSmallBanner.vue'
import ProgressContent from '../../divination/components/ProgressContent.vue'
import CardsLoadError from '../../idle/components/CardsLoadError.vue'
import AnswerCard from '../../answer/components/AnswerCard.vue'
import ActionArea from '../../action_area/components/ActionArea.vue'
import { useMainStage } from '../composables/use_main_stage'
import { useHeaderPresentation } from '../composables/use_header_presentation'
import { useCardsLoadError } from '../composables/use_cards_load_error'

const {
  flow, isWide, cssVarStyle, animationController, answerController,
  showAnswer, answerPanelState, answerResult, answerErrorMessage,
  handleRestart, handleBackHome, handleRetry,
} = useMainStage()

provide('flow', flow)
provide('isWide', isWide)
provide('animationController', animationController)
provide('answerController', answerController)

const { isIdle, headerRole, headerAriaValuetext, headerStyle } =
  useHeaderPresentation(flow, animationController)
const { cardsLoadError } = useCardsLoadError()
</script>

<style scoped>
/* 14PM 画布外壳：铺满视口，横向居中画布，背景填空（main 分支同款策略）。
   rem 链由 design_flexible 按 w/430 缩 root font-size，.main-surface__canvas
   宽写 430px = 10rem，自动跟着 rootFontSize 缩（14PM=430、iPhone 8=375）；
   高度由 .main-surface__canvas height:100vh 独立铺满视口，内部 flex column
   自适应。除 < iPhone 8 (375×667) 之外严禁滚动 — 横向宽 ≥ 375 即装得下画布，
   纵向高 ≥ 667 即由内部 flex 紧凑布局消化。 */
.main-surface {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-page);
  display: flex;
  justify-content: center;
  align-items: stretch;
}

/* too-small (w<375 || h<667) 状态下的 .main-surface overflow / height /
   align 切换由 global.css 接管（Vue 的 :global() 嵌套属性选择器在
   本 scope 内未稳定生效，改用全局规则避免 specificity 漂移）。 */

/* 14PM 画布：宽固定 430px（postcss-pxtorem 转 10rem，由 rootFontSize
   按 w/430 缩；14PM=430，iPhone 8=375），高度铺满视口（height:100%
   继承父级 align-items:stretch 给的 100vh）。 */
.main-surface__canvas {
  position: relative;
  width: 430px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* .main-surface__body：HeaderArea 之下的弹性列容器，承载 HeaderArea /
   Stage / AnswerCard / ActionArea 四段。子项之间用 `--container-gap`
   作为唯一固定间距来源（与 layout solver 的 topInset / reservation
   同源）；Stage 凭 flex:1 自动吸收剩余高度。`--margin` / `--container-gap`
   由 scale bridge 注入，:root 静态兜底。 */
.main-surface__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--container-gap);
  position: relative;
  width: 100%;
  min-height: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--margin));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--margin));
  padding-left: var(--margin);
  padding-right: var(--margin);
  box-sizing: border-box;
}

/* 答案 flow 入场：AnswerCard 与 ActionArea 同帧挂载（各自持 480ms
   ease-out 透明度 + 8px translateY 进场动画）。Stage 因这两段挂出而
   被 flex 即时收缩，用 stage-rise 在视觉上把 stage 从下方滑回，避免
   收缩瞬间卡牌"跳"位。位移量 = (answer-zone min-height + action-area
   高度) / 2，与 layout solver 扣减口径同源。reduced-motion 下禁用。 */
.main-surface__body--with-answer :deep(.stage) {
  animation: stage-rise 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes stage-rise {
  from {
    transform: translateY(
      calc((var(--answer-zone-min-height) + var(--action-area-height)) / 2)
    );
  }
  to   { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .main-surface__canvas {
    transition: none;
  }
  .main-surface__body--with-answer :deep(.stage) {
    animation: none;
  }
}
</style>
