/**
 * Name: flows/index/composables/use_main_stage
 * Purpose: aggregate the main-surface orchestration so MainSurface
 *          stays a pure entry. Owns stores, app phase, responsive width +
 *          resize lifecycle, the CSS-var bridge, the animation + reading
 *          controllers (and their callback wiring), the view picker,
 *          two-phase result-card sizing, reading passthrough, the main
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
import { useReadingController } from '../../reading/composables/use_reading_request_controller'
import { useDevTools } from './use_dev_tools'
import { useCssVarBridge } from '../../../core/sizing/use_css_var_bridge'
import { useMainHandlers } from './create_main_transition_handlers'
import { MAX_CANVAS_WIDTH } from '../../../core/sizing/scale'
import type { OverlayPhase } from '../../shared/composables/animations/phase_contracts'
import type { UseAnimationControllerReturn } from '../../divination/composables/use_animation_controller'
import type { useReadingController as UseReadingControllerFn } from '../../reading/composables/use_reading_request_controller'
import type { useDevTools as UseDevToolsFn } from './use_dev_tools'
import type { DivinationPhase } from '../../../core/store/slices/flow'

export interface MainStage {
  phase: Ref<DivinationPhase>
  isWide: Ref<boolean>
  cssVarStyle: ReturnType<typeof useCssVarBridge>
  animationController: UseAnimationControllerReturn
  readingController: ReturnType<typeof UseReadingControllerFn>
  devTools: ReturnType<typeof UseDevToolsFn>
  /** Gate for the below-card answer (phase ∈ {reading, decision}). The
   *  old split/drawer overlay + its `useActiveView` picker were removed;
   *  the answer is now inline under the card, so this is a one-liner. */
  showAnswer: ComputedRef<boolean>
  readingPanelState: ComputedRef<ReturnType<typeof UseReadingControllerFn>['readingPanelState']['value']>
  readingResult: ComputedRef<ReturnType<typeof UseReadingControllerFn>['readingResult']['value']>
  readingErrorMessage: ComputedRef<ReturnType<typeof UseReadingControllerFn>['readingErrorMessage']['value']>
  handleRestart: () => void
  handleBackHome: () => void
  handleRetry: () => void
  handleTypewriterComplete: () => void
}

export function useMainStage(): MainStage {
  /* Stores + phase */
  const tarotStore = useTarotStore()
  const themeStore = useThemeStore()
  const { phase, startDivination, enterDecision, resetToIdle } = useAppPhase()

  /* Responsive width — capped at MAX_CANVAS_WIDTH (440px). Consumed by the
     animation pipeline (deck/draw layout); the reading split/drawer that
     used to branch on it was removed. */
  const isWide = ref(false)
  function recomputeIsWide() {
    const { windowWidth } = uni.getWindowInfo()
    isWide.value = windowWidth > MAX_CANVAS_WIDTH
  }

  /* CSS variable bridge: ResponsiveSizes → custom properties on root */
  const cssVarStyle = useCssVarBridge()

  /* Controllers (single_card spread → cardCount = 1) */
  const cardCount = computed(() => 1)
  const readingController = useReadingController({ tarotStore })
  let currentReadingPromise: Promise<unknown> | null = null
  const animationController = useAnimationController({
    tarotStore,
    themeStore,
    isWide,
    cardCount,
    callbacks: {
      onDrawingStart: () => { currentReadingPromise = readingController.startReading({}) },
      onPipelineComplete: () => { void settlePipeline() },
      onPhaseChange: (_p: OverlayPhase) => { tarotStore.setPhase('divination') },
      onResetReading: () => { readingController.resetReading() },
      onDestroyReading: () => { readingController.destroyReading() },
    },
  })

  /* The answer is shown inline under the card once the app reaches the
     reading phase (and stays through decision). No overlay view picker. */
  const showAnswer = computed(
    () => phase.value === 'reading' || phase.value === 'decision',
  )

  const readingPanelState = computed(() => readingController.readingPanelState.value)
  const readingResult = computed(() => readingController.readingResult.value)
  const readingErrorMessage = computed(() => readingController.readingErrorMessage.value)

  /* Event handlers */
  const { settlePipeline, handleRestart } = useMainHandlers({
    tarotStore,
    animationController,
    readingController,
    getReadingPromise: () => currentReadingPromise,
    setReadingPromise: (next) => { currentReadingPromise = next },
    startDivination,
  })

  function handleTypewriterComplete() { enterDecision() }
  function handleBackHome() { resetToIdle() }
  function handleRetry() {
    // Fire-and-forget: the click handler must return synchronously, but
    // retryReading is async. Surface failures via console.error rather than
    // letting them silently disappear (the previous `void` pattern hid them).
    readingController.retryReading({}).catch((err) => {
      console.error('[main] retryReading failed', err)
    })
  }

  /* Dev tools (compiled out of production) */
  const devTools = useDevTools({
    animationController,
    readingController,
    setReadingPromise: (promise) => { currentReadingPromise = promise },
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
    readingController,
    devTools,
    showAnswer,
    readingPanelState,
    readingResult,
    readingErrorMessage,
    handleRestart,
    handleBackHome,
    handleRetry,
    handleTypewriterComplete,
  }
}
