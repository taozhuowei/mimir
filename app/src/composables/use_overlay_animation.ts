/**
 * Overlay animation composable
 * Encapsulates all GSAP animation logic for DivinationOverlay
 */

import { computed, nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'
import { useTarotStore } from '../stores/tarot'
import { useThemeStore } from '../stores/theme'
import { CARD_BACK_IMAGE } from '../constants'
import { resolveSpreadLayout, type SpreadScene } from '../utils/spread_layout'

// Max cards for array initialization (cross_spread has 5)
const MAX_CARD_COUNT = 5

interface CardState {
  x: number
  y: number
  rotation: number
  scale: number
  scaleY: number
  opacity: number
}

interface CenterCardState {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  zIndex: number
}

interface InnerState {
  rotationY: number
}

export function useOverlayAnimation(deps: {
  tarotStore: ReturnType<typeof useTarotStore>
  themeStore: ReturnType<typeof useThemeStore>
  isWide: Ref<boolean>
  cardCount: Ref<number>
  emit: ((event: 'complete') => void) & ((event: 'restart') => void)
}) {
  // ---- Reactive state ----
  const phase = ref<'shuffling' | 'cutting' | 'drawing' | 'revealing'>('shuffling')
  const showResults = ref(false)
  const entryAnimationComplete = ref(false)

  // Card dimensions from layout solver (consumed by draw/result cards)
  const layoutCardWidth = ref(172)
  const layoutCardHeight = ref(275)

  // CSS variables driven by solver output
  const overlayVarsStyle = computed(() =>
    `--card-width: ${layoutCardWidth.value}px; --card-height: ${layoutCardHeight.value}px`
  )

  // Track entry animation completion to prevent shuffle CTA competition
  let entryTimeline: gsap.core.Timeline | null = null
  let readingRequestTimer: ReturnType<typeof setTimeout> | null = null

  // Card back image
  const cardBack = computed(() => deps.themeStore.cardBackImage || CARD_BACK_IMAGE)

  function getCardImg(index: number): string {
    return deps.tarotStore.drawnCards[index]?.card.image || cardBack.value
  }

  // ---- GSAP animation state objects (plain JS, GSAP manipulates these directly) ----
  // Background overlay
  const _bg = { opacity: 0 }
  // Stage overall (moves up during draw)
  const _stage = { y: 0 }
  // Progress header / footer actions (entry animation)
  const _header = { y: 60, opacity: 0 }
  const _footer = { y: 60, opacity: 0 }
  // Deck container (shuffle shake effect)
  const _deckCtn = { x: 0 }
  // Initial deck 12 cards (stacked)
  const _initials: CardState[] = Array.from({ length: 12 }, (_, i) => ({
    x: 0, y: -(i * 0.8), rotation: 0, scale: 1, scaleY: 1, opacity: 1,
  }))
  // Shuffle left/right 6 cards each
  const _lefts: CardState[] = Array.from({ length: 6 }, () => ({
    x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, opacity: 0,
  }))
  const _rights: CardState[] = Array.from({ length: 6 }, () => ({
    x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, opacity: 0,
  }))
  // Cut cards 3 (absolute positioned centered)
  const _cutTop: CenterCardState = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 }
  const _cutMid: CenterCardState = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 }
  const _cutBot: CenterCardState = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 }
  // Drawn cards (absolute positioned centered)
  const _draws: CenterCardState[] = Array.from({ length: MAX_CARD_COUNT }, (_, i) => ({
    x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 20 - i,
  }))
  // 3D flip inner
  const _inners: InnerState[] = Array.from({ length: MAX_CARD_COUNT }, () => ({ rotationY: 0 }))

  // ---- Vue style refs (bound to template :style, updated by refresh functions) ----
  const bgStyle = ref('opacity: 0')
  const stageStyle = ref('')
  const headerStyle = ref('transform: translateY(60px); opacity: 0')
  const footerStyle = ref('transform: translateY(60px); opacity: 0')
  const deckCtnStyle = ref('')

  // Initial values consistent with _initials state
  const initialsStyle = ref<string[]>(
    _initials.map((s, i) => `transform: translateY(${-i * 0.8}px)`),
  )

  const leftsVisible = ref(false)
  const leftsStyle = ref<string[]>(Array.from({ length: 6 }, () => ''))
  const rightsVisible = ref(false)
  const rightsStyle = ref<string[]>(Array.from({ length: 6 }, () => ''))

  const cutTopVisible = ref(false)
  const cutMidVisible = ref(false)
  const cutBotVisible = ref(false)
  const cutTopStyle = ref('')
  const cutMidStyle = ref('')
  const cutBotStyle = ref('')

  const drawsVisible = ref<boolean[]>(Array(MAX_CARD_COUNT).fill(false))
  const drawsStyle = ref<string[]>(Array(MAX_CARD_COUNT).fill(''))
  const drawsSizeStyle = ref<{ width: string; height: string }[]>(Array(MAX_CARD_COUNT).fill({ width: '', height: '' }))
  const innersStyle = ref<string[]>(Array(MAX_CARD_COUNT).fill(''))

  // Stage container height for narrow screen results
  const stageContainerHeightPx = ref(uni.getWindowInfo().windowHeight)
  const stageContainerStyle = computed(() => {
    if (deps.isWide.value || !showResults.value) return 'height: 100vh'
    return 'height: ' + stageContainerHeightPx.value + 'px'
  })

  // ---- CSS style string constructors ----
  function _cardStyleStr(s: CardState): string {
    const sy = s.scaleY !== 1 ? ` scaleY(${s.scaleY})` : ''
    return (
      `transform: translateX(${s.x}px) translateY(${s.y}px) rotate(${s.rotation}deg) scale(${s.scale})${sy};` +
      ` opacity: ${s.opacity}; will-change: transform`
    )
  }

  function _centerStyleStr(s: CenterCardState): string {
    return (
      `transform: translateX(calc(-50% + ${s.x}px)) translateY(calc(-50% + ${s.y}px))` +
      ` rotate(${s.rotation}deg) scale(${s.scale});` +
      ` opacity: ${s.opacity}; z-index: ${s.zIndex}; will-change: transform`
    )
  }

  function _cardSizeStyleStr(width: number, height: number): { width: string; height: string } {
    return {
      width: `${width}px`,
      height: `${height}px`,
    }
  }

  function _innerStyleStr(s: InnerState): string {
    return `transform: rotateY(${s.rotationY}deg)`
  }

  // ---- Refresh functions (called in GSAP onUpdate, sync state objects to Vue refs) ----
  const refreshBg = () => { bgStyle.value = `opacity: ${_bg.opacity}` }
  const refreshStage = () => { stageStyle.value = `transform: translateY(${_stage.y}px)` }
  const refreshHeader = () => { headerStyle.value = `transform: translateY(${_header.y}px); opacity: ${_header.opacity}` }
  const refreshFooter = () => { footerStyle.value = `transform: translateY(${_footer.y}px); opacity: ${_footer.opacity}` }
  const refreshDeckCtn = () => { deckCtnStyle.value = `transform: translateX(${_deckCtn.x}px)` }
  const refreshInitials = () => { initialsStyle.value = _initials.map(s => _cardStyleStr(s)) }
  const refreshLefts = () => { leftsStyle.value = _lefts.map(s => _cardStyleStr(s)) }
  const refreshRights = () => { rightsStyle.value = _rights.map(s => _cardStyleStr(s)) }
  const refreshCutTop = () => { cutTopStyle.value = _centerStyleStr(_cutTop) }
  const refreshCutMid = () => { cutMidStyle.value = _centerStyleStr(_cutMid) }
  const refreshCutBot = () => { cutBotStyle.value = _centerStyleStr(_cutBot) }
  const refreshCuts = () => { refreshCutTop(); refreshCutMid(); refreshCutBot() }
  const refreshDraws = () => {
    drawsStyle.value = _draws.map(s => _centerStyleStr(s))
  }
  const refreshInners = () => { innersStyle.value = _inners.map(s => _innerStyleStr(s)) }

  // ---- Window dimensions (cross-platform) ----
  function getTopBarHeight(): number {
    // #ifdef MP-WEIXIN
    try {
      const { top, height } = uni.getMenuButtonBoundingClientRect()
      return top + height + 8
    } catch {
      return 88
    }
    // #endif
    return 0
  }

  function getResultHeaderBottom(): number {
    const { windowWidth } = uni.getWindowInfo()
    const rpxToPx = windowWidth / 750
    const iconHeight = 40

    // #ifdef MP-WEIXIN
    try {
      const { top } = uni.getMenuButtonBoundingClientRect()
      return top + Math.round(80 * rpxToPx) + iconHeight
    } catch {
      return Math.round(44 + 80 * rpxToPx) + iconHeight
    }
    // #endif

    return Math.round(20 * rpxToPx) + iconHeight
  }

  function getCardDimensions(): { width: number; height: number } {
    const { width: stage_width, height: stage_height } = getStageDimensions()
    const scene: SpreadScene = showResults.value ? 'result_stage' : 'draw_stage'
    const layout = resolveSpreadLayout({
      spreadKind: deps.tarotStore.spreadKind,
      scene,
      containerWidth: stage_width,
      containerHeight: stage_height,
      isWide: deps.isWide.value,
      cardAspectRatio: 1.6,
    })
    return { width: layout.cardWidth, height: layout.cardHeight }
  }

  function getCardWidth(): number {
    return getCardDimensions().width
  }

  function getCardHeight(): number {
    return getCardDimensions().height
  }

  function getStageDimensions(): { width: number; height: number } {
    const { windowWidth, windowHeight } = uni.getWindowInfo()
    const topBar = getTopBarHeight()
    if (showResults.value) {
      if (deps.isWide.value) return { width: windowWidth * 0.44, height: windowHeight }
      return { width: windowWidth, height: windowHeight * 0.42 }
    }
    return { width: windowWidth, height: windowHeight - topBar }
  }

  function clearReadingRequestTimer() {
    if (readingRequestTimer !== null) {
      clearTimeout(readingRequestTimer)
      readingRequestTimer = null
    }
  }

  function scheduleReadingRequest() {
    clearReadingRequestTimer()
    readingRequestTimer = setTimeout(() => {
      readingRequestTimer = null
      deps.tarotStore.startReadingRequest().catch(() => {
        // Keep the overlay in revealing state when the request fails.
      })
    }, 0)
  }

  function settleEntryAnimation() {
    if (entryTimeline) {
      entryTimeline.progress(1)
      entryTimeline.kill()
      entryTimeline = null
    }

    _bg.opacity = 1
    refreshBg()

    _initials.forEach((state, index) => {
      state.x = 0
      state.y = -(index * 0.8)
      state.rotation = 0
      state.scale = 1
      state.scaleY = 1
      state.opacity = 1
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

  // ---- Window resize ----
  let _resizeHandler: ((res: UniApp.WindowResizeResult) => void) | null = null

  function _checkWidth(windowWidth: number) {
    const wasWide = deps.isWide.value
    deps.isWide.value = windowWidth >= 768
    if (wasWide !== deps.isWide.value && showResults.value) {
      nextTick(() => updateLayout())
    }
  }

  // ---- Shuffle animation ----
  function playShuffle() {
    settleEntryAnimation()

    const cardWidth = getCardWidth()
    const spreadX = cardWidth * 0.85

    const timeline = gsap.timeline({
      onComplete: () => {
        playCut()
      },
      onUpdate: () => {
        refreshInitials()
        refreshLefts()
        refreshRights()
      },
    })

    timeline.add(() => {
      _initials.forEach(s => { s.opacity = 0 })
      refreshInitials()

      _lefts.forEach((s, i) => { s.opacity = 1; s.x = 0; s.y = -(i * 0.8); s.rotation = 0; s.scale = 1; s.scaleY = 1 })
      _rights.forEach((s, i) => { s.opacity = 1; s.x = 0; s.y = -4.8 - i * 0.8; s.rotation = 0; s.scale = 1; s.scaleY = 1 })
      leftsVisible.value = true
      rightsVisible.value = true
      refreshLefts()
      refreshRights()
    }, 0)

    timeline
      .to(_lefts, { x: -spreadX, y: (i: number) => -30 - i * 0.8, rotation: -16, duration: 0.5, ease: 'power2.out' }, 0)
      .to(_rights, { x: spreadX, y: (i: number) => 30 - i * 0.8, rotation: 16, duration: 0.5, ease: 'power2.out' }, '<')
      .to(_lefts, { x: 0, y: (i: number) => -(i * 1.6), rotation: -2, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, '+=0.2')
      .to(_rights, { x: 0, y: (i: number) => -0.8 - i * 1.6, rotation: 2, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, '<0.03')
      .add(() => {
        _lefts.forEach(s => { s.opacity = 0 })
        _rights.forEach(s => { s.opacity = 0 })
        leftsVisible.value = false
        rightsVisible.value = false
        refreshLefts()
        refreshRights()

        _initials.forEach(s => { s.opacity = 1; s.scaleY = 0.9 })
        refreshInitials()
      })
      .to(_initials, { scaleY: 1, duration: 0.2, ease: 'power1.out' })
  }

  // ---- Cut animation ----
  function playCut() {
    phase.value = 'cutting'
    deps.tarotStore.setPhase('cutting')

    const cardWidth = getCardWidth()
    const cardHeight = getCardHeight()
    const spread = deps.isWide.value ? cardWidth * 1.5 : cardHeight * 1.3
    const leftX = deps.isWide.value ? -spread : 0
    const leftY = deps.isWide.value ? 0 : -spread
    const rightX = deps.isWide.value ? spread : 0
    const rightY = deps.isWide.value ? 0 : spread

    const timeline = gsap.timeline({
      onComplete: () => {
        playDraw()
      },
      onUpdate: () => {
        refreshInitials()
        refreshCuts()
      },
    })

    timeline.add(() => {
      Object.assign(_cutTop, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 10 })
      Object.assign(_cutMid, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 10 })
      Object.assign(_cutBot, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 10 })
      cutTopVisible.value = true
      cutMidVisible.value = true
      cutBotVisible.value = true
      refreshCuts()

      _initials.forEach(s => { s.opacity = 0 })
      refreshInitials()
    })

    timeline
      .to(_cutTop, { x: leftX, y: leftY, duration: 0.7, ease: 'power3.out' })
      .to(_cutBot, { x: rightX, y: rightY, duration: 0.7, ease: 'power3.out' }, '<')
      .to(_cutTop, { x: rightX, y: rightY, zIndex: 11, duration: 0.7, ease: 'power2.inOut' }, '+=0.15')
      .to(_cutMid, { x: 0, y: 0, zIndex: 12, duration: 0.7, ease: 'power2.inOut' }, '<')
      .to(_cutBot, { x: leftX, y: leftY, zIndex: 13, duration: 0.7, ease: 'power2.inOut' }, '<')
      .to(_cutTop, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.45, ease: 'power2.out' }, '+=0.2')
      .to(_cutMid, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.45, delay: 0.15, ease: 'power2.out' }, '<')
      .to(_cutBot, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.45, delay: 0.3, ease: 'power2.out' }, '<')
      .add(() => {
        cutTopVisible.value = false
        cutMidVisible.value = false
        cutBotVisible.value = false
        refreshCuts()

        _initials.forEach(s => { s.opacity = 1 })
        refreshInitials()
      })
  }

  // ---- Draw animation ----
  function playDraw() {
    phase.value = 'drawing'
    deps.tarotStore.setPhase('drawing')
    deps.tarotStore.drawCards()

    const { width: stage_width, height: stage_height } = getStageDimensions()
    const card_height = getCardHeight()

    const drawLayout = resolveSpreadLayout({
      spreadKind: deps.tarotStore.spreadKind,
      scene: 'draw_stage',
      containerWidth: stage_width,
      containerHeight: stage_height,
      isWide: deps.isWide.value,
      cardAspectRatio: 1.6,
      headerHeight: getResultHeaderBottom(),
    })

    const targetX = drawLayout.cards.map(c => c.x)
    const targetY = drawLayout.cards.map(c => c.y)
    const liftY = drawLayout.stageShiftY

    drawsSizeStyle.value = drawLayout.cards.map(c => _cardSizeStyleStr(c.width, c.height))
    layoutCardWidth.value = drawLayout.cardWidth
    layoutCardHeight.value = drawLayout.cardHeight

    const preRotations = Array.from({ length: deps.cardCount.value }, () => (Math.random() - 0.5) * 15)

    const timeline = gsap.timeline({
      onUpdate: () => {
        refreshDeckCtn()
        refreshStage()
        refreshInitials()
        refreshDraws()
        refreshInners()
      },
    })

    timeline
      .to(_stage, { y: -liftY, duration: 1.8, ease: 'power2.inOut' }, '+=0.2')
      .to(_initials, { opacity: 0, y: (i: number) => -card_height * 0.4 - i * 0.8, scale: 0.8, duration: 0.6, ease: 'power1.in' }, '<0.2')

    Array.from({ length: deps.cardCount.value }, (_, i) => i).forEach((index) => {
      timeline.add(() => {
        Object.assign(_draws[index], {
          x: 0,
          y: index === 0 ? -card_height * 0.3 : -stage_height,
          rotation: preRotations[index],
          scale: 1,
          opacity: 1,
          zIndex: 20 - index,
        })
        const newVisible = drawsVisible.value.map((v, i) => (i === index ? true : v))
        drawsVisible.value = newVisible
        refreshDraws()
      }, 1 + index * 0.3)

      timeline
        .to(_draws[index], { x: targetX[index], y: targetY[index] + card_height * 0.4, duration: 0.7, ease: 'power2.in' }, '>')
        .to(_draws[index], { y: targetY[index] + card_height * 0.56, duration: 0.4, ease: 'power1.out' }, '>')
        .to(_draws[index], { y: targetY[index], duration: 1.5, ease: 'power3.out' }, '>')
    })

    const alignTime = 1 + (deps.cardCount.value - 1) * 0.3 + 0.7 + 0.4 + 1.5 + 0.5
    const flipDuration = 1 + (deps.cardCount.value - 1) * 0.4
    const revealingStart = alignTime + 1.2 + flipDuration + 0.1
    const finishTime = revealingStart + 0.3

    timeline
      .to(
        _draws,
        {
          x: (index: number) => targetX[index],
          y: (index: number) => targetY[index],
          rotation: 0,
          duration: 0.8,
          ease: 'power3.inOut',
        },
        alignTime + 0.1,
      )
      .to(_draws, { scale: 0.92, duration: 0.5, ease: 'power1.out' }, alignTime + 0.9)
      .to(
        _inners,
        { rotationY: 180, duration: 1, stagger: 0.4, ease: 'back.out(1.1)' },
        alignTime + 1.2,
      )
      .add(() => {
        phase.value = 'revealing'
        deps.tarotStore.setPhase('revealing')
      }, revealingStart)
      .add(() => { void finish() }, finishTime)

    scheduleReadingRequest()
  }

  // ---- Result layout update ----
  function updateLayout() {
    if (phase.value !== 'revealing' && phase.value !== 'drawing') return

    const { width: stage_width, height: stage_height } = getStageDimensions()

    const scene: SpreadScene = showResults.value ? 'result_stage' : 'draw_stage'
    const layout = resolveSpreadLayout({
      spreadKind: deps.tarotStore.spreadKind,
      scene,
      containerWidth: stage_width,
      containerHeight: stage_height,
      isWide: deps.isWide.value,
      cardAspectRatio: 1.6,
      headerHeight: getResultHeaderBottom(),
    })

    layoutCardWidth.value = layout.cardWidth
    layoutCardHeight.value = layout.cardHeight
    drawsSizeStyle.value = layout.cards.map(c => _cardSizeStyleStr(c.width, c.height))

    const targetX = layout.cards.map(c => c.x)
    const targetY = layout.cards.map(c => c.y)

    if (showResults.value) {
      gsap.to(_stage, { y: 0, duration: 0.6, ease: 'power2.out', onUpdate: refreshStage })
    }

    _draws.forEach((draw, i) => {
      gsap.to(draw, {
        x: targetX[i],
        y: targetY[i],
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: refreshDraws,
      })
    })
  }

  async function finish() {
    try {
      if (!deps.tarotStore.readingResult) {
        await deps.tarotStore.waitForReadingResult()
      }
    } catch {
      return
    }

    if (!deps.tarotStore.readingResult) {
      return
    }

    deps.tarotStore.revealResult()

    const { windowHeight } = uni.getWindowInfo()
    if (!deps.isWide.value) {
      const heightObj = { value: stageContainerHeightPx.value }
      gsap.to(heightObj, {
        value: windowHeight * 0.42,
        duration: 0.6,
        ease: 'power2.inOut',
        onUpdate: () => { stageContainerHeightPx.value = heightObj.value },
      })
    }
    showResults.value = true
    nextTick(() => { updateLayout() })
  }

  // ---- Start function ----
  function start() {
    nextTick(() => {
      const cardHeight = getCardHeight()
      const entryDrop = cardHeight * 4
      entryAnimationComplete.value = false

      entryTimeline = gsap.timeline({
        onComplete: () => {
          entryAnimationComplete.value = true
          entryTimeline = null
          setTimeout(() => { playShuffle() }, 300)
        },
      })

      entryTimeline.fromTo(_bg, { opacity: 0 }, {
        opacity: 1,
        duration: 0.7,
        onUpdate: refreshBg,
      }, 0)

      entryTimeline.fromTo(
        _initials,
        { y: -entryDrop, rotation: 180, scale: 0.5, opacity: 1, scaleY: 1, x: 0 },
        {
          y: (index: number) => -(index * 0.8),
          rotation: 0,
          scale: 1,
          scaleY: 1,
          duration: 1.05,
          ease: 'power3.out',
          stagger: 0.02,
          onUpdate: refreshInitials,
        },
        0,
      )

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
    })
  }

  // ---- Restart function ----
  function restart() {
    clearReadingRequestTimer()
    showResults.value = false
  }

  // ---- Lifecycle ----
  onMounted(() => {
    const { windowWidth } = uni.getWindowInfo()
    _checkWidth(windowWidth)

    const initDims = getCardDimensions()
    layoutCardWidth.value = initDims.width
    layoutCardHeight.value = initDims.height

    _resizeHandler = (res) => { _checkWidth(res.size.windowWidth) }
    uni.onWindowResize(_resizeHandler)

    start()
  })

  onUnmounted(() => {
    clearReadingRequestTimer()
    if (_resizeHandler) uni.offWindowResize(_resizeHandler)
    if (entryTimeline) {
      entryTimeline.kill()
    }
    gsap.killTweensOf([
      _bg,
      _stage,
      _header,
      _footer,
      _deckCtn,
      ..._initials,
      ..._lefts,
      ..._rights,
      _cutTop,
      _cutMid,
      _cutBot,
      ..._draws,
      ..._inners,
    ])
  })

  // ---- Return values ----
  return {
    stageContainerStyle,
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
    showResults,
    phase,
    entryAnimationComplete,
    layoutCardWidth,
    layoutCardHeight,
    overlayVarsStyle,
    getCardImg,
    cardBack,
    restart,
  }
}
