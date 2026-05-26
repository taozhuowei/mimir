/**
 * Name: flows/base/composables/use_main_stage
 * Purpose: aggregate the main-surface orchestration so MainSurface
 *          stays a pure entry. Owns stores, application-level flow,
 *          responsive width + resize lifecycle, the CSS-var bridge, the
 *          animation + answer controllers (and their callback wiring),
 *          single-sized result-card sizing, answer passthrough, and the
 *          main event handlers.
 * Data flow: constructs the controller graph and lifecycle → returns refs /
 *          computeds / handlers MainSurface binds; provide() stays in
 *          MainSurface so the inject contract is visible at the surface root.
 */
import { computed, ref, onMounted, onUnmounted, type ComputedRef, type Ref } from 'vue'
import { useFlow } from './use_flow'
import { useTarotStore } from '../../../core/store/tarot'
import { useThemeStore } from '../../../core/store/theme'
import { useAnimationController } from '../../divination/composables/use_animation_controller'
import { useAnswerController } from '../../answer/composables/use_answer_request_controller'
import { useCssVarBridge } from '../../../core/sizing/use_css_var_bridge'
import { useMainHandlers } from './create_main_transition_handlers'
import { MAX_CANVAS_WIDTH } from '../../../core/sizing/scale'
import type { OverlayPhase } from './animations/phase_contracts'
import type { UseAnimationControllerReturn } from '../../divination/composables/use_animation_controller'
import type { useAnswerController as UseAnswerControllerFn } from '../../answer/composables/use_answer_request_controller'
import type { Flow } from '../../../core/store/slices/flow'

export interface MainStage {
  flow: Ref<Flow>
  isWide: Ref<boolean>
  cssVarStyle: ReturnType<typeof useCssVarBridge>
  animationController: UseAnimationControllerReturn
  answerController: ReturnType<typeof UseAnswerControllerFn>
  /** Gate for the below-card answer + action area (terminal `answer` flow). */
  showAnswer: ComputedRef<boolean>
  answerPanelState: ComputedRef<ReturnType<typeof UseAnswerControllerFn>['answerPanelState']['value']>
  answerResult: ComputedRef<ReturnType<typeof UseAnswerControllerFn>['answerResult']['value']>
  answerErrorMessage: ComputedRef<ReturnType<typeof UseAnswerControllerFn>['answerErrorMessage']['value']>
  handleRestart: () => void
  handleBackHome: () => void
  handleRetry: () => void
}

export function useMainStage(): MainStage {
  const tarotStore = useTarotStore()
  const themeStore = useThemeStore()
  const { flow, startDivination, resetToIdle } = useFlow()

  /* `isWide` — single source of truth for the responsive flag, written
     ONLY here (on window resize, threshold = MAX_CANVAS_WIDTH 440). Its
     sole consumer is the cut-animation axis (motion_metrics: wide →
     horizontal split, narrow → vertical). */
  const isWide = ref(false)
  function recomputeIsWide() {
    const { windowWidth } = uni.getWindowInfo()
    isWide.value = windowWidth > MAX_CANVAS_WIDTH
  }

  /* CSS variable bridge: ResponsiveSizes → custom properties on root */
  const cssVarStyle = useCssVarBridge()

  /* Controllers (single_card spread → cardCount = 1) */
  const cardCount = computed(() => 1)
  const answerController = useAnswerController({ tarotStore })
  let currentAnswerPromise: Promise<unknown> | null = null
  const animationController = useAnimationController({
    tarotStore,
    themeStore,
    isWide,
    cardCount,
    callbacks: {
      onDrawingStart: () => { currentAnswerPromise = answerController.startAnswer({}) },
      onPipelineComplete: () => { void settlePipeline() },
      onPhaseChange: (_p: OverlayPhase) => { tarotStore.setFlow('divination') },
      onResetAnswer: () => { answerController.resetAnswer() },
      onDestroyAnswer: () => { answerController.destroyAnswer() },
    },
  })

  /* `answer` is the terminal flow state — answer zone + action area
     mount together at this point. */
  const showAnswer = computed(() => flow.value === 'answer')

  const answerPanelState = computed(() => answerController.answerPanelState.value)
  const answerResult = computed(() => answerController.answerResult.value)
  const answerErrorMessage = computed(() => answerController.answerErrorMessage.value)

  /* Event handlers */
  const { settlePipeline, handleRestart } = useMainHandlers({
    tarotStore,
    animationController,
    answerController,
    getAnswerPromise: () => currentAnswerPromise,
    setAnswerPromise: (next: Promise<unknown> | null) => { currentAnswerPromise = next },
    startDivination,
  })

  function handleBackHome() { resetToIdle() }
  function handleRetry() {
    answerController.retryAnswer({}).catch((err) => {
      console.error('[main] retryAnswer failed', err)
    })
  }

  /* Lifecycle */
  onMounted(() => {
    recomputeIsWide()
    uni.onWindowResize(recomputeIsWide)
  })
  onUnmounted(() => { uni.offWindowResize(recomputeIsWide) })

  return {
    flow,
    isWide,
    cssVarStyle,
    animationController,
    answerController,
    showAnswer,
    answerPanelState,
    answerResult,
    answerErrorMessage,
    handleRestart,
    handleBackHome,
    handleRetry,
  }
}
