/**
 * Name: flows/base/composables/create_main_transition_handlers
 * Purpose: extracts the two longest event handlers from `MainSurface.vue`
 *          (`handleRestart` + `settlePipeline`) so that SFC can stay
 *          inside the 300-line file cap. Both functions orchestrate
 *          multi-step transitions that have to keep the animation
 *          controller, answer controller, and tarot store in lock-step,
 *          which is why they're worth a named home rather than inline
 *          closures.
 * Reason: `MainSurface.vue` was crossing the 300-line file cap by
 *          ~6 lines because the restart sequence and the pipeline-settle
 *          handler both spelled out their full step-by-step flow inline.
 *          Pulling them into a composable keeps MainSurface focused on
 *          orchestration wiring while the step list stays auditable in
 *          one place.
 * Data flow: caller passes the same controller refs the page already
 *          holds; this composable returns the two handlers and a setter
 *          for the in-flight answer promise the page tracks so
 *          `settlePipeline` can `await` it before promoting to answer.
 */
import type { useTarotStore } from '../../../core/store/tarot'
import type { useAnimationController } from '../../divination/composables/use_animation_controller'
import type { useAnswerController } from '../../answer/composables/use_answer_request_controller'

export interface UseMainHandlersDeps {
  tarotStore: ReturnType<typeof useTarotStore>
  animationController: ReturnType<typeof useAnimationController>
  answerController: ReturnType<typeof useAnswerController>
  /** Read the current in-flight answer promise (or null). */
  getAnswerPromise: () => Promise<unknown> | null
  /** Replace the in-flight answer promise (called after settle clears it). */
  setAnswerPromise: (next: Promise<unknown> | null) => void
  /** Application-phase entry to (re)start a divination with the same question. */
  startDivination: (question: string) => void
}

export interface MainHandlers {
  /**
   * Settle the in-flight answer and promote the application flow to the
   * terminal `answer` state for both success AND error outcomes. The
   * inline answer zone + action area are gated by `flow === 'answer'`
   * in MainSurface, so without this branch a failed
   * /api/v1/divinations response leaves the user stuck on the reveal
   * animation with no error UI mounted (docs/state.md 异常与恢复;
   * verified by network_error.spec.ts). On error AnswerCard renders
   * the error line + ActionArea swaps the primary CTA to "重试读取".
   */
  settlePipeline: () => Promise<void>
  /**
   * Restart the divination from the current question. Resumes any paused
   * animations, clears the timeline + answer state, then re-enters the
   * shuffle phase from a clean slate so the second run looks identical
   * to the first (no leaked tweens, no stale draws).
   */
  handleRestart: () => void
}

export function useMainHandlers(deps: UseMainHandlersDeps): MainHandlers {
  async function settlePipeline(): Promise<void> {
    try {
      await (deps.getAnswerPromise() ?? Promise.resolve(null))
    } catch (err) {
      console.error('[main] settlePipeline failed', err)
    }
    deps.setAnswerPromise(null)
    const status = deps.answerController.answerPanelState.value
    const hasResolvedSuccess =
      status === 'success' && deps.answerController.answerResult.value !== null
    if (hasResolvedSuccess || status === 'error') {
      deps.tarotStore.enterAnswer()
    }
  }

  function handleRestart(): void {
    const { animationController, answerController } = deps
    animationController.resumeAnimations()
    animationController.setPlaybackRate(1)
    answerController.resetAnswer()
    animationController.clearTimeline()
    animationController.seek(0)
    animationController.showResults.value = false
    animationController.resetOverlayScene()
    deps.startDivination(deps.tarotStore.currentQuestion)
    animationController.resetProgressModel()
    animationController.phase.value = 'shuffling'
    animationController.start()
  }

  return { settlePipeline, handleRestart }
}
