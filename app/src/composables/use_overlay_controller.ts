/**
 * Name: use_overlay_controller
 * Purpose: orchestrate overlay animations, progress, and reading state as a single controller.
 * Reason: provides a clean interface for DivinationOverlay.vue while delegating to specialized modules.
 * Data flow: store state flows in; view-ready styles, states, and handlers flow out.
 */

import { computed, nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'
import { useTarotStore } from '../stores/tarot'
import { useThemeStore } from '../stores/theme'
import { CARD_BACK_IMAGE } from '../constants'
import type { OverlayPhase } from '../utils/overlay_animations/types'
import {
  createShuffleInitialStates,
  createCutInitialStates,
  createDrawInitialStates,
  buildShuffleTimeline,
  buildCutTimeline,
  buildDrawTimeline,
  buildRevealTimeline,
  setupRevealInitialState,
  type ShuffleAnimationContext,
  type CutAnimationContext,
  type DrawAnimationContext,
  type RevealAnimationContext,
} from '../utils/overlay_animations'
import { createProgressModel, calculatePhaseProgress } from '../utils/overlay_progress_model'
import { presentProgressHeader, presentFooter, DEFAULT_OVERLAY_TEXT } from '../utils/overlay_progress_presenter'
import { createTimelineOrchestrator, killAnimationTargets } from '../utils/overlay_timeline'
import {
  resolveOverlaySceneLayout,
  resolveOverlayCutLayout,
  resolveOverlayRevealMotion,
  type OverlaySceneLayout,
} from '../utils/overlay_layout'
import { resolveOverlayViewport, type OverlayViewportMetrics } from '../utils/overlay_viewport'
import { OfflineReadingProvider } from '../utils/reading/offline_reading_provider'
import { createReadingOrchestrator } from '../utils/reading/reading_orchestrator'
import type { ReadingRequest } from '../utils/reading/reading_provider'

const MAX_CARD_COUNT = 5
const AUTO_REVEAL_DELAY_MS = 800
const ENTRY_TO_SHUFFLE_DELAY_MS = 300

export interface UseOverlayControllerDeps {
  tarotStore: ReturnType<typeof useTarotStore>
  themeStore: ReturnType<typeof useThemeStore>
  isWide: Ref<boolean>
  cardCount: Ref<number>
  emit: ((event: 'complete') => void) & ((event: 'restart') => void)
}

export function useOverlayController(deps: UseOverlayControllerDeps) {
  // State refs
  const phase = ref<OverlayPhase>('shuffling')
  const showResults = ref(false)
  const entryAnimationComplete = ref(false)
  const isPaused = ref(false)
  const playbackRate = ref(1)
  const layoutCardWidth = ref(172)
  const layoutCardHeight = ref(275)

  // Progress model
  const progressModel = createProgressModel('shuffling')

  // Reading orchestrator
  const readingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const readingResult = ref(deps.tarotStore.readingResult)
  const readingError = ref<string | null>(null)

  const readingOrchestrator = createReadingOrchestrator({
    provider: new OfflineReadingProvider(),
    statusRef: readingStatus,
    resultRef: readingResult,
    errorRef: readingError,
    errorMessage: '解读暂时不可用，请稍后重试',
  })

  // Timeline orchestrator
  const timelineOrchestrator = createTimelineOrchestrator(false)

  // Animation state objects
  const _bg = { opacity: 0 }
  const _stage = { y: 0 }
  const _header = { y: 60, opacity: 0 }
  const _footer = { y: 60, opacity: 0 }
  const _deckCtn = { x: 0 }

  const { initials: _initials, lefts: _lefts, rights: _rights } = createShuffleInitialStates()
  const { cutTop: _cutTop, cutMid: _cutMid, cutBot: _cutBot } = createCutInitialStates()
  const { draws: _draws, inners: _inners } = createDrawInitialStates(MAX_CARD_COUNT)

  // Visible flags
  const leftsVisible = ref(false)
  const rightsVisible = ref(false)
  const cutTopVisible = ref(false)
  const cutMidVisible = ref(false)
  const cutBotVisible = ref(false)
  const drawsVisible = ref<boolean[]>(Array(MAX_CARD_COUNT).fill(false))

  // Style refs
  const bgStyle = ref('opacity: 0')
  const stageStyle = ref('')
  const headerStyle = ref('transform: translateY(60px); opacity: 0')
  const footerStyle = ref('transform: translateY(60px); opacity: 0')
  const deckCtnStyle = ref('')
  const initialsStyle = ref<string[]>(_initials.map((_, i) => `transform: translateY(${-i * 0.8}px)`))
  const leftsStyle = ref<string[]>(Array.from({ length: 6 }, () => ''))
  const rightsStyle = ref<string[]>(Array.from({ length: 6 }, () => ''))
  const cutTopStyle = ref('')
  const cutMidStyle = ref('')
  const cutBotStyle = ref('')
  const drawsStyle = ref<string[]>(Array(MAX_CARD_COUNT).fill(''))
  const drawsSizeStyle = ref<{ width: string; height: string }[]>(
    Array.from({ length: MAX_CARD_COUNT }, () => ({ width: '', height: '' })),
  )
  const innersStyle = ref<string[]>(Array(MAX_CARD_COUNT).fill(''))

  // Container sizing
  const stageContainerHeightPx = ref(uni.getWindowInfo().windowHeight)
  const stageContainerStyle = computed(() => {
    if (deps.isWide.value || !showResults.value) {
      return 'height: 100vh'
    }
    return `height: ${stageContainerHeightPx.value}px`
  })

  const resultZoneStyle = computed(() => {
    if (!showResults.value) return ''
    const { windowHeight } = uni.getWindowInfo()
    if (deps.isWide.value) {
      return `height: ${windowHeight}px`
    }
    return `height: ${Math.max(windowHeight - stageContainerHeightPx.value, 0)}px`
  })

  const overlayVarsStyle = computed(() =>
    `--card-width: ${layoutCardWidth.value}px; --card-height: ${layoutCardHeight.value}px`,
  )

  // Computed values
  const cardBack = computed(() => deps.themeStore.cardBackImage || CARD_BACK_IMAGE)
  const readingPanelState = computed(() => readingOrchestrator.state.status)
  const readingErrorMessage = computed(() => readingOrchestrator.state.error || '')
  const isReadingFailed = computed(() => readingOrchestrator.state.status === 'error')
  const isReadingLoading = computed(() => readingOrchestrator.state.status === 'loading')

  // Progress presentation
  const progressHeaderPresentation = computed(() =>
    presentProgressHeader(phase.value, (name) => deps.themeStore.getUiAsset(name)),
  )

  const footerPresentation = computed(() =>
    presentFooter(phase.value, showResults.value),
  )

  // Phase steps for template
  const phaseSteps = computed(() => calculatePhaseProgress(phase.value))
  const activePhaseIndex = computed(() => phaseSteps.value.findIndex((s) => s.isActive))

  // Refresh functions
  function _cardStyleStr(state: { x: number; y: number; rotation: number; scale: number; scaleY: number; opacity: number }): string {
    const scaleY = state.scaleY !== 1 ? ` scaleY(${state.scaleY})` : ''
    return (
      `transform: translateX(${state.x}px) translateY(${state.y}px) rotate(${state.rotation}deg) scale(${state.scale})${scaleY};` +
      ` opacity: ${state.opacity}; will-change: transform`
    )
  }

  function _centerStyleStr(state: { x: number; y: number; rotation: number; scale: number; opacity: number; zIndex: number }): string {
    return (
      `transform: translateX(calc(-50% + ${state.x}px)) translateY(calc(-50% + ${state.y}px))` +
      ` rotate(${state.rotation}deg) scale(${state.scale});` +
      ` opacity: ${state.opacity}; z-index: ${state.zIndex}; will-change: transform`
    )
  }

  function _cardSizeStyleStr(width: number, height: number): { width: string; height: string } {
    return { width: `${width}px`, height: `${height}px` }
  }

  function _innerStyleStr(state: { rotationY: number }): string {
    return `transform: rotateY(${state.rotationY}deg)`
  }

  const refreshBg = () => { bgStyle.value = `opacity: ${_bg.opacity}` }
  const refreshStage = () => { stageStyle.value = `transform: translateY(${_stage.y}px)` }
  const refreshHeader = () => { headerStyle.value = `transform: translateY(${_header.y}px); opacity: ${_header.opacity}` }
  const refreshFooter = () => { footerStyle.value = `transform: translateY(${_footer.y}px); opacity: ${_footer.opacity}` }
  const refreshDeckCtn = () => { deckCtnStyle.value = `transform: translateX(${_deckCtn.x}px)` }
  const refreshInitials = () => { initialsStyle.value = _initials.map(_cardStyleStr) }
  const refreshLefts = () => { leftsStyle.value = _lefts.map(_cardStyleStr) }
  const refreshRights = () => { rightsStyle.value = _rights.map(_cardStyleStr) }
  const refreshCutTop = () => { cutTopStyle.value = _centerStyleStr(_cutTop) }
  const refreshCutMid = () => { cutMidStyle.value = _centerStyleStr(_cutMid) }
  const refreshCutBot = () => { cutBotStyle.value = _centerStyleStr(_cutBot) }
  const refreshCuts = () => { refreshCutTop(); refreshCutMid(); refreshCutBot() }
  const refreshDraws = () => { drawsStyle.value = _draws.map(_centerStyleStr) }
  const refreshInners = () => { innersStyle.value = _inners.map(_innerStyleStr) }

  // Layout helpers
  function getMenuButtonRect() {
    // #ifdef MP-WEIXIN
    try {
      const { top, height } = uni.getMenuButtonBoundingClientRect()
      return { top, height }
    } catch {
      return { top: 44, height: 32 }
    }
    // #endif
    return null
  }

  function getViewportMetrics(nextShowResults: boolean = showResults.value): OverlayViewportMetrics {
    const { windowWidth, windowHeight } = uni.getWindowInfo()
    return resolveOverlayViewport({
      windowWidth,
      windowHeight,
      isWide: deps.isWide.value,
      showResults: nextShowResults,
      menuButtonRect: getMenuButtonRect(),
    })
  }

  function getSceneLayout(scene: 'draw_stage' | 'result_stage'): OverlaySceneLayout {
    return resolveOverlaySceneLayout({
      spreadKind: deps.tarotStore.spreadKind,
      scene,
      viewport: getViewportMetrics(scene === 'result_stage'),
      isWide: deps.isWide.value,
      cardAspectRatio: 1.6,
    })
  }

  function setDrawCardSizes(layout: OverlaySceneLayout) {
    drawsSizeStyle.value = Array.from({ length: MAX_CARD_COUNT }, (_, index) => {
      const card = layout.cards[index]
      return _cardSizeStyleStr(card?.width ?? layout.cardWidth, card?.height ?? layout.cardHeight)
    })
    layoutCardWidth.value = layout.cardWidth
    layoutCardHeight.value = layout.cardHeight
  }

  function getOverlayLayouts() {
    const drawViewport = getViewportMetrics(false)
    const drawLayout = resolveOverlaySceneLayout({
      spreadKind: deps.tarotStore.spreadKind,
      scene: 'draw_stage',
      viewport: drawViewport,
      isWide: deps.isWide.value,
      cardAspectRatio: 1.6,
    })
    const resultLayout = resolveOverlaySceneLayout({
      spreadKind: deps.tarotStore.spreadKind,
      scene: 'result_stage',
      viewport: getViewportMetrics(true),
      isWide: deps.isWide.value,
      cardAspectRatio: 1.6,
    })
    const revealMotion = resolveOverlayRevealMotion({
      drawCardWidth: drawLayout.cardWidth,
      resultCardWidth: resultLayout.cardWidth,
    })
    return { drawViewport, drawLayout, resultLayout, revealMotion }
  }

  function getCardImg(index: number): string {
    return deps.tarotStore.drawnCards[index]?.card.image || cardBack.value
  }

  // Animation control
  function setPlaybackRate(rate: number) {
    playbackRate.value = rate
    timelineOrchestrator.setPlaybackRate(rate)
  }

  function pauseAnimations() {
    isPaused.value = true
    timelineOrchestrator.pause()
  }

  function resumeAnimations() {
    isPaused.value = false
    timelineOrchestrator.resume()
  }

  function stepForward() {
    timelineOrchestrator.stepForward()
  }

  function stepBackward() {
    timelineOrchestrator.stepBackward()
  }

  function seek(position: number | string) {
    timelineOrchestrator.seek(position)
  }

  // State reset
  function resetShuffleVisualState() {
    leftsVisible.value = false
    rightsVisible.value = false
    _lefts.forEach((state) => {
      Object.assign(state, { x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, opacity: 0 })
    })
    _rights.forEach((state) => {
      Object.assign(state, { x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, opacity: 0 })
    })
    refreshLefts()
    refreshRights()
  }

  function resetCutVisualState() {
    cutTopVisible.value = false
    cutMidVisible.value = false
    cutBotVisible.value = false
    Object.assign(_cutTop, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 })
    Object.assign(_cutMid, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 })
    Object.assign(_cutBot, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 })
    refreshCuts()
  }

  function resetDrawVisualState() {
    drawsVisible.value = Array(MAX_CARD_COUNT).fill(false)
    _draws.forEach((state, index) => {
      Object.assign(state, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 20 - index })
    })
    _inners.forEach((state) => { state.rotationY = 0 })
    refreshDraws()
    refreshInners()
  }

  function resetInitialDeckState() {
    _initials.forEach((state, index) => {
      Object.assign(state, { x: 0, y: -(index * 0.8), rotation: 0, scale: 1, scaleY: 1, opacity: 1 })
    })
    refreshInitials()
  }

  function resetOverlayScene() {
    const { windowHeight } = uni.getWindowInfo()
    showResults.value = false
    stageContainerHeightPx.value = windowHeight
    readingOrchestrator.reset()

    _bg.opacity = 1
    _stage.y = 0
    _header.y = 0
    _header.opacity = 1
    _footer.y = 0
    _footer.opacity = 1
    _deckCtn.x = 0

    refreshBg()
    refreshStage()
    refreshHeader()
    refreshFooter()
    refreshDeckCtn()

    resetInitialDeckState()
    resetShuffleVisualState()
    resetCutVisualState()
    resetDrawVisualState()

    const drawLayout = getSceneLayout('draw_stage')
    setDrawCardSizes(drawLayout)
  }

  function interruptCurrentAnimation() {
    readingOrchestrator.reset()
    resumeAnimations()
    timelineOrchestrator.clear()

    killAnimationTargets([
      _bg, _stage, _header, _footer, _deckCtn,
      ..._initials, ..._lefts, ..._rights,
      _cutTop, _cutMid, _cutBot, ..._draws, ..._inners,
    ])
  }

  function settleEntryAnimation() {
    _bg.opacity = 1
    refreshBg()

    _initials.forEach((state, index) => {
      Object.assign(state, { x: 0, y: -(index * 0.8), rotation: 0, scale: 1, scaleY: 1, opacity: 1 })
    })
    refreshInitials()

    _header.y = 0
    _header.opacity = 1
    _footer.y = 0
    _footer.opacity = 1
    refreshHeader()
    refreshFooter()

    entryAnimationComplete.value = true
  }

  // Phase animations
  function playShuffle() {
    settleEntryAnimation()

    const shuffleContext: ShuffleAnimationContext = {
      initials: _initials,
      lefts: _lefts,
      rights: _rights,
      leftsVisible,
      rightsVisible,
      refreshInitials,
      refreshLefts,
      refreshRights,
    }

    const timeline = buildShuffleTimeline(
      shuffleContext,
      { layoutCardWidth: layoutCardWidth.value },
      () => playCut(),
    )

    timelineOrchestrator.add(timeline)
  }

  function playCut() {
    phase.value = 'cutting'
    progressModel.transitionTo('cutting')
    deps.tarotStore.setPhase('cutting')

    const viewport = getViewportMetrics(false)
    const cutLayout = resolveOverlayCutLayout({
      viewport,
      isWide: deps.isWide.value,
      cardWidth: layoutCardWidth.value,
      cardHeight: layoutCardHeight.value,
    })

    const cutContext: CutAnimationContext = {
      cutTop: _cutTop,
      cutMid: _cutMid,
      cutBot: _cutBot,
      cutTopVisible,
      cutMidVisible,
      cutBotVisible,
      refreshCuts,
    }

    const timeline = buildCutTimeline(
      cutContext,
      { layout: cutLayout },
      () => playDraw(),
    )

    timelineOrchestrator.add(timeline)
  }

  function playDraw() {
    phase.value = 'drawing'
    progressModel.transitionTo('drawing')
    deps.tarotStore.setPhase('drawing')
    deps.tarotStore.drawCards()

    const { drawViewport, drawLayout, resultLayout, revealMotion } = getOverlayLayouts()
    setDrawCardSizes(drawLayout)

    const drawContext: DrawAnimationContext = {
      stage: _stage,
      initials: _initials,
      draws: _draws,
      inners: _inners,
      drawsVisible,
      deckCtn: _deckCtn,
      refreshStage,
      refreshInitials,
      refreshDraws,
      refreshInners,
      refreshDeckCtn,
      onPhaseChange: (p) => {
        phase.value = p
        progressModel.transitionTo(p)
        deps.tarotStore.setPhase(p)
      },
    }

    const timeline = buildDrawTimeline(
      drawContext,
      {
        cardCount: deps.cardCount.value,
        cardHeight: drawLayout.cardHeight,
        stageHeight: drawViewport.stageHeight,
        liftY: drawLayout.stageShiftY,
        targetX: drawLayout.cards.map((c) => c.x),
        targetY: drawLayout.cards.map((c) => c.y),
        focusScale: revealMotion.focusScale,
        autoRevealDelayMs: AUTO_REVEAL_DELAY_MS,
      },
      () => finish(revealMotion.dockScale, resultLayout),
    )

    // Schedule reading request
    const request: ReadingRequest = {
      cards: deps.tarotStore.drawnCards,
      question: deps.tarotStore.currentQuestion,
      spreadKind: deps.tarotStore.spreadKind,
    }
    setTimeout(() => {
      void readingOrchestrator.start(request)
    }, 0)

    timelineOrchestrator.add(timeline)
  }

  function playRevealOnly() {
    phase.value = 'revealing'
    progressModel.transitionTo('revealing')
    deps.tarotStore.setPhase('revealing')

    if (deps.tarotStore.drawnCards.length === 0) {
      deps.tarotStore.drawCards()
    }

    const { drawLayout, resultLayout, revealMotion } = getOverlayLayouts()
    setDrawCardSizes(drawLayout)

    const revealContext: RevealAnimationContext = {
      stage: _stage,
      draws: _draws,
      inners: _inners,
      drawsVisible,
      initials: _initials,
      refreshStage,
      refreshDraws,
      refreshInners,
      refreshInitials,
    }

    const timeline = buildRevealTimeline(
      revealContext,
      {
        cardCount: deps.cardCount.value,
        drawLayout,
        focusScale: revealMotion.focusScale,
      },
      () => finish(revealMotion.dockScale, resultLayout),
    )

    // Schedule reading request
    const request: ReadingRequest = {
      cards: deps.tarotStore.drawnCards,
      question: deps.tarotStore.currentQuestion,
      spreadKind: deps.tarotStore.spreadKind,
    }
    setTimeout(() => {
      void readingOrchestrator.start(request)
    }, 0)

    timelineOrchestrator.add(timeline)
  }

  function replayFromPhase(targetPhase: OverlayPhase) {
    interruptCurrentAnimation()
    entryAnimationComplete.value = true
    resetOverlayScene()
    phase.value = targetPhase
    progressModel.transitionTo(targetPhase)
    deps.tarotStore.setPhase(targetPhase)

    switch (targetPhase) {
      case 'shuffling':
        playShuffle()
        break
      case 'cutting':
        playCut()
        break
      case 'drawing':
        playDraw()
        break
      case 'revealing':
        playRevealOnly()
        break
    }
  }

  function updateLayout() {
    if (phase.value !== 'revealing' && phase.value !== 'drawing') return

    const layout = getSceneLayout(showResults.value ? 'result_stage' : 'draw_stage')
    setDrawCardSizes(layout)

    const targetX = layout.cards.map((c) => c.x)
    const targetY = layout.cards.map((c) => c.y)

    if (showResults.value) {
      gsap.to(_stage, {
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: refreshStage,
      })
    }

    _draws.forEach((draw, index) => {
      if (index >= layout.cards.length) return
      gsap.to(draw, {
        x: targetX[index],
        y: targetY[index],
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: refreshDraws,
      })
    })
  }

  function openResultPanel() {
    if (showResults.value) return

    const targetViewport = getViewportMetrics(true)
    showResults.value = true

    if (!deps.isWide.value) {
      const heightObj = { value: stageContainerHeightPx.value }
      gsap.to(heightObj, {
        value: targetViewport.stageContainerHeight,
        duration: 0.6,
        ease: 'power2.inOut',
        onUpdate: () => { stageContainerHeightPx.value = heightObj.value },
      })
    }

    nextTick(() => updateLayout())
  }

  async function finish(dockScale: number, _resultLayout: OverlaySceneLayout) {
    openResultPanel()
    _draws.forEach((draw, index) => {
      if (index < deps.cardCount.value) {
        draw.scale = dockScale
      }
    })
    refreshDraws()

    // Wait for reading result
    const checkResult = () => {
      if (readingOrchestrator.state.status === 'success' && readingOrchestrator.state.result) {
        deps.tarotStore.revealResult()
        deps.emit('complete')
        return true
      }
      if (readingOrchestrator.state.status === 'error') {
        return true
      }
      return false
    }

    if (!checkResult()) {
      const interval = setInterval(() => {
        if (checkResult()) {
          clearInterval(interval)
        }
      }, 100)
    }
  }

  async function retryReading() {
    if (readingOrchestrator.state.isLoading) return null

    openResultPanel()

    const request: ReadingRequest = {
      cards: deps.tarotStore.drawnCards,
      question: deps.tarotStore.currentQuestion,
      spreadKind: deps.tarotStore.spreadKind,
    }
    const result = await readingOrchestrator.retry(request)
    if (result) {
      deps.tarotStore.revealResult()
    }
    return result
  }

  // Entry animation
  function start() {
    nextTick(() => {
      const entryDrop = layoutCardHeight.value * 4
      entryAnimationComplete.value = false

      const entryTimeline = gsap.timeline({
        onComplete: () => {
          entryAnimationComplete.value = true
        },
      })

      entryTimeline.fromTo(_bg, { opacity: 0 }, {
        opacity: 1,
        duration: 0.7,
        onUpdate: refreshBg,
      }, 0)

      entryTimeline.fromTo(_initials, {
        y: -entryDrop,
        rotation: 180,
        scale: 0.5,
        opacity: 1,
      }, {
        y: (index: number) => -(index * 0.8),
        rotation: 0,
        scale: 1,
        duration: 1.05,
        ease: 'power3.out',
        stagger: 0.02,
        onUpdate: refreshInitials,
      }, 0)

      entryTimeline.fromTo(_header, { y: 100, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: refreshHeader,
      }, 0.4)

      entryTimeline.fromTo(_footer, { y: 100, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out',
        onUpdate: refreshFooter,
      }, 0.6)

      entryTimeline.call(() => playShuffle(), [], `+=${ENTRY_TO_SHUFFLE_DELAY_MS / 1000}`)
      timelineOrchestrator.add(entryTimeline)
    })
  }

  function restart() {
    resumeAnimations()
    setPlaybackRate(1)
    readingOrchestrator.reset()
    timelineOrchestrator.clear()
    timelineOrchestrator.seek(0)
    showResults.value = false
    stageContainerHeightPx.value = uni.getWindowInfo().windowHeight
    resetOverlayScene()
    progressModel.reset()
    phase.value = 'shuffling'
    start()
  }

  // Resize handling
  let resizeHandler: ((res: UniApp.WindowResizeResult) => void) | null = null

  function checkWidth(windowWidth: number) {
    const wasWide = deps.isWide.value
    deps.isWide.value = windowWidth >= 768
    if (wasWide !== deps.isWide.value && (showResults.value || phase.value === 'drawing' || phase.value === 'revealing')) {
      nextTick(() => updateLayout())
    }
  }

  // Lifecycle
  onMounted(() => {
    resumeAnimations()
    setPlaybackRate(1)

    const { windowWidth } = uni.getWindowInfo()
    checkWidth(windowWidth)

    const drawLayout = getSceneLayout('draw_stage')
    setDrawCardSizes(drawLayout)

    resizeHandler = (res) => checkWidth(res.size.windowWidth)
    uni.onWindowResize(resizeHandler)

    start()
  })

  onUnmounted(() => {
    readingOrchestrator.reset()
    resumeAnimations()
    setPlaybackRate(1)
    if (resizeHandler) {
      uni.offWindowResize(resizeHandler)
    }
    timelineOrchestrator.clear()
    timelineOrchestrator.kill()
    killAnimationTargets([
      _bg, _stage, _header, _footer, _deckCtn,
      ..._initials, ..._lefts, ..._rights,
      _cutTop, _cutMid, _cutBot, ..._draws, ..._inners,
    ])
  })

  return {
    // Styles
    stageContainerStyle,
    resultZoneStyle,
    bgStyle,
    stageStyle,
    headerStyle,
    footerStyle,
    deckCtnStyle,
    initialsStyle,
    leftsStyle,
    rightsStyle,
    leftsVisible,
    rightsVisible,
    cutTopStyle,
    cutMidStyle,
    cutBotStyle,
    cutTopVisible,
    cutMidVisible,
    cutBotVisible,
    drawsStyle,
    drawsSizeStyle,
    innersStyle,
    drawsVisible,
    overlayVarsStyle,

    // State
    showResults,
    phase,
    entryAnimationComplete,
    layoutCardWidth,
    layoutCardHeight,
    playbackRate,
    isPaused,

    // Reading state
    readingPanelState,
    readingErrorMessage,
    isReadingFailed,
    isReadingLoading,

    // Progress
    progressHeaderPresentation,
    footerPresentation,
    phaseSteps,
    activePhaseIndex,

    // Content
    cardBack,
    getCardImg,
    overlayText: DEFAULT_OVERLAY_TEXT,

    // Controls
    setPlaybackRate,
    pauseAnimations,
    resumeAnimations,
    stepForward,
    stepBackward,
    seek,
    replayFromPhase,
    restart,
    retryReading,
  }
}
