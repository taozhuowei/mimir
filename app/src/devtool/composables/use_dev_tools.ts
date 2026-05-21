/**
 * 名称：devtool/composables/use_dev_tools
 * 职责：封装 DevToolsPanel 的本地开关与事件处理（replay / skip-to-answer /
 *      playback rate / 容器边框开关），对外暴露 reactive flag 与 handler。
 *      正常流程下 answer 由 pipeline 的 onDrawingStart 钩子启动；revealing
 *      重放路径绕过 drawing builder，由本 composable 手动 seed answer 请求。
 * 数据流：animation + answer controllers 注入；ref 与 handler 反向流出供 SFC 绑定。
 */
import { ref, type Ref } from 'vue'
import type { OverlayPhase } from '../../flows/base/composables/animations/phase_contracts'
// #ifdef H5
import { toggleContainerBorders as toggleContainerBordersH5 } from '../../core/utils/dev/container_borders'
// #endif

/** Animation controller surface this composable touches. */
export interface DevAnimationController {
  replayFromPhase: (phase: OverlayPhase) => void
  skipToAnswer: () => void
  setPlaybackRate: (rate: number) => void
}

/** Answer controller surface this composable touches. */
export interface DevAnswerController {
  resetAnswer: () => void
  startAnswer: (args: Record<string, unknown>) => Promise<unknown>
}

export interface UseDevToolsDeps {
  animationController: DevAnimationController
  answerController: DevAnswerController
  /**
   * Setter for the page-owned in-flight answer promise. The replay path
   * for `revealing` synchronously kicks off a new answer (because the
   * drawing builder is skipped) and the page needs to await the same
   * promise in `settlePipeline`.
   */
  setAnswerPromise: (promise: Promise<unknown> | null) => void
  /**
   * 当前处于 idle 阶段时，dev replay/skip 需要先走正常路径让 rig 启动
   * (watchPhaseStateMachine 监听 idle→divination 才会调 animCtrl.start
   * 注册 resize handler 并跑 pipeline)。此函数在 idle 时同步触发 startDivination
   * 让 watcher 进入 divination 模式；返回的 promise resolve 时 watcher 已
   * flush，dev 路径可直接 interrupt 并接管。非 idle 时空操作。
   */
  ensureRigStarted: () => Promise<void>
}

export interface DevTools {
  isDevExpanded: Ref<boolean>
  showContainerBorders: Ref<boolean>
  handleDevReplay: (targetPhase: OverlayPhase) => Promise<void>
  handleDevSkipToAnswer: () => Promise<void>
  handleDevPlaybackRate: (rate: number) => void
  toggleContainerBorders: () => void
}

export function useDevTools(deps: UseDevToolsDeps): DevTools {
  // Mount collapsed (single 40 px circular icon at the bottom-right corner)
  // so the panel never starts up half-overlapping the canvas. The user can
  // tap the handle to expand it on demand. The previous default of
  // `isDevExpanded = true` rendered the full 220 × 230 panel pinned to the
  // bottom-right with the panel's right edge falling 160+ px outside the
  // viewport on phone-shell widths — devs had to drag it back in or scroll
  // sideways to see the controls. Defaulting to collapsed keeps the
  // panel's footprint inside any supported canvas (375 → 1440 px).
  const isDevExpanded = ref(false)
  const showContainerBorders = ref(false)

  async function handleDevReplay(targetPhase: OverlayPhase): Promise<void> {
    // idle 入口：先让 watchPhaseStateMachine 触发 rig.start（包括 resize 注册
    // 和 animCtrl.start 跑全 pipeline）；replayFromPhase 内的 interruptCurrentAnimation
    // 会随后立即中断它，避免双 pipeline 重叠交替触发 onPhaseChange 把
    // store.phase 一直拉回 'divination'。
    await deps.ensureRigStarted()
    // 顺序关键：replayFromPhase 同步内部会跑 resetOverlayScene → onResetAnswer，
    // 它会把 status 清回 idle。必须先让重放跑完同步部分（包括 reset），再启动
    // 新 answer，否则 reset 会把 startAnswer 写入的 'loading'/'success' 覆盖掉，
    // 导致 settlePipeline 永远读到 status='idle' 不切阶段。
    deps.animationController.replayFromPhase(targetPhase)
    // 仅 revealing 路径跳过了 drawing builder（onDrawingStart 不触发），需手动
    // 启动 answer 请求；其余阶段会在 drawing onDrawingStart 钩子里自然启动。
    if (targetPhase === 'revealing') {
      deps.setAnswerPromise(deps.answerController.startAnswer({}))
    }
  }

  async function handleDevSkipToAnswer(): Promise<void> {
    await deps.ensureRigStarted()
    // 顺序关键：必须先 resetAnswer 清掉 resultRef，否则 startAnswer 会因
    //"已有结果"短路立即 resolve 而不发起 doRequest；之后 skipToAnswer 同步
    // 内的 reset 会把 statusRef 清回 idle，而新的 doRequest 又写不回 'success'，
    // 导致 settlePipeline 读到 idle 不切阶段。
    // 正确顺序：reset → startAnswer (doRequest 在飞) → skipToAnswer (同步 reset
    // 不会取消 doRequest，它后续 resolve 时会写入 statusRef='success')；
    // settlePipeline await 同一 promise，read 到 success 后切到 answer。
    deps.answerController.resetAnswer()
    deps.setAnswerPromise(deps.answerController.startAnswer({}))
    deps.animationController.skipToAnswer()
  }

  function handleDevPlaybackRate(rate: number): void {
    deps.animationController.setPlaybackRate(rate)
  }

  function toggleContainerBorders(): void {
    showContainerBorders.value = !showContainerBorders.value
    // #ifdef H5
    toggleContainerBordersH5(showContainerBorders.value)
    // #endif
  }

  return {
    isDevExpanded,
    showContainerBorders,
    handleDevReplay,
    handleDevSkipToAnswer,
    handleDevPlaybackRate,
    toggleContainerBorders,
  }
}
