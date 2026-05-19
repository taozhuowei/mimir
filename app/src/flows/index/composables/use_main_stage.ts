/**
 * Name: flows/index/composables/use_main_stage
 * Purpose: aggregate the main-surface orchestration so MainSurface
 *          stays a pure entry. Owns stores, app phase, responsive width +
 *          resize lifecycle, the CSS-var bridge, the animation + answer
 *          controllers (and their callback wiring), the view picker,
 *          two-phase result-card sizing, answer passthrough, the main
 *          event handlers, and dev tools.
 * Data flow: constructs the controller graph and lifecycle → returns refs /
 *          computeds / handlers MainSurface binds; provide() stays in
 *          MainSurface so the inject contract is visible at the surface root.
 */
import { computed, ref, onMounted, onUnmounted, type ComputedRef, type Ref } from 'vue'
import { useAppPhase } from '../../../core/composables/use_app_phase'
import { useTarotStore } from '../../../core/store/tarot'
import { useThemeStore } from '../../../core/store/theme'
import { useAnimationController } from '../../divination/composables/use_animation_controller'
import { useAnswerController } from '../../answer/composables/use_answer_request_controller'
import { useDevTools } from './use_dev_tools'
import { useCssVarBridge } from '../../../core/sizing/use_css_var_bridge'
import { useMainHandlers } from './create_main_transition_handlers'
import { MAX_CANVAS_WIDTH } from '../../../core/sizing/scale'
import type { OverlayPhase } from '../../shared/composables/animations/phase_contracts'
import type { UseAnimationControllerReturn } from '../../divination/composables/use_animation_controller'
import type { useAnswerController as UseAnswerControllerFn } from '../../answer/composables/use_answer_request_controller'
import type { useDevTools as UseDevToolsFn } from './use_dev_tools'
import type { DivinationPhase } from '../../../core/store/slices/flow'

export interface MainStage {
  phase: Ref<DivinationPhase>
  isWide: Ref<boolean>
  cssVarStyle: ReturnType<typeof useCssVarBridge>
  animationController: UseAnimationControllerReturn
  answerController: ReturnType<typeof UseAnswerControllerFn>
  devTools: ReturnType<typeof UseDevToolsFn>
  /** Gate for the below-card answer (phase ∈ {answer, decision}). The
   *  old split/drawer overlay + its `useActiveView` picker were removed;
   *  the answer is now inline under the card, so this is a one-liner. */
  showAnswer: ComputedRef<boolean>
  answerPanelState: ComputedRef<ReturnType<typeof UseAnswerControllerFn>['answerPanelState']['value']>
  answerResult: ComputedRef<ReturnType<typeof UseAnswerControllerFn>['answerResult']['value']>
  answerErrorMessage: ComputedRef<ReturnType<typeof UseAnswerControllerFn>['answerErrorMessage']['value']>
  handleRestart: () => void
  handleBackHome: () => void
  handleRetry: () => void
  handleAnswerRevealed: () => void
}

export function useMainStage(): MainStage {
  /* Stores + phase */
  const tarotStore = useTarotStore()
  const themeStore = useThemeStore()
  const { phase, startDivination, enterDecision, resetToIdle } = useAppPhase()

  /* `isWide` — single source of truth for the responsive flag, written
     ONLY here (on window resize, threshold = MAX_CANVAS_WIDTH 440). Its
     sole consumer is the cut-animation axis (motion_metrics: wide →
     horizontal split, narrow → vertical). F5 removed a second writer (the
     old 920 PC breakpoint via checkWidth) that raced this one on the same
     ref and left the axis non-deterministic in the 440–920 band. */
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
      onPhaseChange: (_p: OverlayPhase) => { tarotStore.setPhase('divination') },
      onResetAnswer: () => { answerController.resetAnswer() },
      onDestroyAnswer: () => { answerController.destroyAnswer() },
    },
  })

  /* The answer is shown inline under the card once the app reaches the
     answer phase (and stays through decision). No overlay view picker. */
  const showAnswer = computed(
    () => phase.value === 'answer' || phase.value === 'decision',
  )

  const answerPanelState = computed(() => answerController.answerPanelState.value)
  const answerResult = computed(() => answerController.answerResult.value)
  const answerErrorMessage = computed(() => answerController.answerErrorMessage.value)

  /* Event handlers */
  const { settlePipeline, handleRestart } = useMainHandlers({
    tarotStore,
    animationController,
    answerController,
    getAnswerPromise: () => currentAnswerPromise,
    setAnswerPromise: (next) => { currentAnswerPromise = next },
    startDivination,
  })

  function handleAnswerRevealed() { enterDecision() }
  function handleBackHome() { resetToIdle() }
  function handleRetry() {
    // Fire-and-forget: the click handler must return synchronously, but
    // retryAnswer is async. Surface failures via console.error rather than
    // letting them silently disappear (the previous `void` pattern hid them).
    answerController.retryAnswer({}).catch((err) => {
      console.error('[main] retryAnswer failed', err)
    })
  }

  /* Dev tools (compiled out of production) */
  const devTools = useDevTools({
    animationController,
    answerController,
    setAnswerPromise: (promise) => { currentAnswerPromise = promise },
  })

  /* Lifecycle */
  onMounted(() => {
    recomputeIsWide()
    uni.onWindowResize(recomputeIsWide)
  })
  onUnmounted(() => { uni.offWindowResize(recomputeIsWide) })

  return {
    phase,
    isWide,
    cssVarStyle,
    animationController,
    answerController,
    devTools,
    showAnswer,
    answerPanelState,
    answerResult,
    answerErrorMessage,
    handleRestart,
    handleBackHome,
    handleRetry,
    handleAnswerRevealed,
  }
}
