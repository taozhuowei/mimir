<template>
  <!--
    Main divination surface (docs/prd/glossary.md 路由 #1). Composes the
    divination surface — HeaderArea (TitleContent ↔ ProgressContent by
    flow) + Stage (CardsLoadError | StageDeck) — with the inline answer
    zone (AnswerCard + ActionArea) struck below the result card in the
    terminal `answer` flow; no split / drawer / side panel.
    NotificationHost sits on the surface root for cross-view alerts. The
    .main-surface__canvas wrapper caps the divination canvas at
    MAX_CANVAS_WIDTH (docs/prd/animation.md 视图过渡动画), centered. The
    single StageDeck instance stays mounted across idle ↔ divination, so
    the swap is a header-content change only. Mounted by pages/index.vue
    only when bootstrap did not fail (the fallback view is its
    mutually-exclusive sibling) — so useMainStage is never constructed
    in the failed state.
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
        <view v-if="showAnswer" class="answer-zone">
          <AnswerCard
            :state="answerPanelState"
            :answer-result="answerResult"
            :error-message="answerErrorMessage"
          />
        </view>
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
    <DevToolsPanel
      :phase-steps="animationController.phaseSteps.value"
      :playback-rate="animationController.playbackRate.value"
      :is-paused="animationController.isPaused.value"
      :is-dev-expanded="devTools.isDevExpanded.value"
      :show-container-borders="devTools.showContainerBorders.value"
      @replay="devTools.handleDevReplay"
      @skip-to-answer="devTools.handleDevSkipToAnswer"
      @playback-rate="devTools.handleDevPlaybackRate"
      @pause="animationController.pauseAnimations"
      @resume="animationController.resumeAnimations"
      @step-forward="animationController.stepForward"
      @step-backward="animationController.stepBackward"
      @toggle-dev-expanded="devTools.isDevExpanded.value = !devTools.isDevExpanded.value"
      @toggle-container-borders="devTools.toggleContainerBorders"
    />
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
 *          inline answer zone (AnswerCard + ActionArea), notifications
 *          and dev tools.
 * Reason: extracted out of pages/index.vue so that page is a pure
 *         boot shell — it mounts this surface only when bootstrap
 *         succeeded (or is pending), and the fallback view otherwise, so
 *         useMainStage is never constructed in the failed state.
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
import DevToolsPanel from '../../../devtool/components/DevToolsPanel.vue'
import { useMainStage } from '../composables/use_main_stage'
import { useHeaderPresentation } from '../composables/use_header_presentation'
import { useCardsLoadError } from '../composables/use_cards_load_error'

const {
  flow, isWide, cssVarStyle, animationController, answerController, devTools,
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

/* .main-surface__body：HeaderArea 之下的弹性列容器，直接承载
   HeaderArea / Stage / .answer-zone / ActionArea 四段。Stage 通过 flex:1
   占满剩余高度并严格几何居中卡牌；.answer-zone 与 ActionArea 作为兄弟
   flex item 紧贴下方。`--margin` 由 scale bridge 注入。 */
.main-surface__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--margin));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--margin));
  padding-left: var(--margin);
  padding-right: var(--margin);
  box-sizing: border-box;
}

/* 答案区与操作区同步入场：opacity + 8px translateY，二者作为兄弟节点
   在 flow='answer' 同帧挂载，视觉上同时出现。stage-rise 是它们出现导
   致 Stage 高度收缩时的卡牌让位补位动画，时长 / 曲线对齐。 */
.answer-zone {
  /* 高度由 layout solver 的 answerStageReservation 锁定，与
     `--answer-zone-height` CSS 变量同源；layout 求解器据此扣减 stage
     可用高，使卡牌 reveal 终态正好落在 Stage flex 实际 DOM 高度内，
     不再溢出到 header 区域。内部三态 (loading/error/success) 在固定
     盒高内排版；超长答案文案走内部 overflow:auto。 */
  flex: 0 0 auto;
  height: var(--answer-zone-height);
  max-height: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  animation: answer-zone-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes answer-zone-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Stage 高度由 flex 在答案区挂出瞬间即收缩；用 transform 从旧中心点
   位置（translateY ≈ answer 高度/2）滑到 0 来补位。60px 取 loading
   状态下答案区高度 ~120px 的一半，配合 ease-out 让前段位移迅速、
   后段平滑收尾。reduced-motion 下禁用。 */
.main-surface__body--with-answer :deep(.stage) {
  animation: stage-rise 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes stage-rise {
  from { transform: translateY(60px); }
  to   { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .main-surface__canvas {
    transition: none;
  }
  .answer-zone,
  .main-surface__body--with-answer :deep(.stage) {
    animation: none;
  }
}
</style>
