/**
 * Name: use_animation_state
 * Purpose: own all GSAP target objects, visibility flags, style refs, refresh callbacks, and per-group reset functions.
 * Reason: separates animation state management from the overlay controller for better modularity.
 * Data flow: receives layout results and options; returns reactive styles, states, and helpers.
 */

import { computed, ref, watch, reactive } from 'vue'
import {
  createShuffleInitialStates,
  createCutInitialStates,
  createDrawInitialStates,
} from '../utils/overlay_animation'
import type { SceneLayoutResult } from '../core/layout/scene_layout'

export function useAnimationState(opts: {
  deckCount: number
  shuffleHalfCount: number
  maxCutPiles: number
  maxCardCount: number
}) {
  // Animation state objects (reactive so Vue watch can observe deep mutations)
  const _bg = reactive({ opacity: 0 })
  const _stage = reactive({ y: 0 })
  const _header = reactive({ y: 60, opacity: 0 })
  const _footer = reactive({ y: 60, opacity: 0 })
  const _deckCtn = reactive({ x: 0 })

  const { initials: rawInitials, lefts: rawLefts, rights: rawRights } = createShuffleInitialStates(opts.deckCount, opts.shuffleHalfCount)
  const { piles: rawPiles } = createCutInitialStates(opts.maxCutPiles)
  const { draws: rawDraws, inners: rawInners } = createDrawInitialStates(opts.maxCardCount)

  const _initials = reactive(rawInitials)
  const _lefts = reactive(rawLefts)
  const _rights = reactive(rawRights)
  const _piles = reactive(rawPiles)
  const _draws = reactive(rawDraws)
  const _inners = reactive(rawInners)

  // Visible flags
  const leftsVisible = ref(false)
  const rightsVisible = ref(false)
  const pilesVisible = ref<boolean[]>(Array(opts.maxCutPiles).fill(false))
  const drawsVisible = ref<boolean[]>(Array(opts.maxCardCount).fill(false))

  // Size refs
  const layoutCardWidth = ref(172)
  const layoutCardHeight = ref(275)

  // Style refs
  const bgStyle = ref('opacity: 0')
  const stageStyle = ref('')
  const headerStyle = ref('transform: translateY(60px); opacity: 0')
  const footerStyle = ref('transform: translateY(60px); opacity: 0')
  const deckCtnStyle = ref('')
  const initialsStyle = ref<string[]>(_initials.map((_, i) => `transform: translateY(${-i * 0.8}px)`))
  const leftsStyle = ref<string[]>(Array.from({ length: opts.shuffleHalfCount }, () => ''))
  const rightsStyle = ref<string[]>(Array.from({ length: opts.shuffleHalfCount }, () => ''))
  const pilesStyle = ref<string[]>(Array(opts.maxCutPiles).fill(''))
  const drawsStyle = ref<string[]>(Array(opts.maxCardCount).fill(''))
  const drawsSizeStyle = ref<{ width: string; height: string }[]>(
    Array.from({ length: opts.maxCardCount }, () => ({ width: '', height: '' })),
  )
  const innersStyle = ref<string[]>(Array(opts.maxCardCount).fill(''))

  const overlayVarsStyle = computed(() =>
    `--card-width: ${layoutCardWidth.value}px; --card-height: ${layoutCardHeight.value}px`,
  )

  // Refresh functions
  function _cardStyleStr(state: { x: number; y: number; rotation: number; scale: number; scaleY: number; opacity: number }): string {
    const scaleY = state.scaleY !== 1 ? ` scaleY(${state.scaleY})` : ''
    return (
      `transform: translateX(${state.x}px) translateY(${state.y}px) rotate(${state.rotation}deg) scale(${state.scale})${scaleY};` +
      ` opacity: ${state.opacity}`
    )
  }

  function _centerStyleStr(state: { x: number; y: number; rotation: number; scale: number; opacity: number; zIndex: number }): string {
    return (
      `transform: translateX(calc(-50% + ${state.x}px)) translateY(calc(-50% + ${state.y}px))` +
      ` rotate(${state.rotation}deg) scale(${state.scale});` +
      ` opacity: ${state.opacity}; z-index: ${state.zIndex}`
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
  const refreshPiles = () => { pilesStyle.value = _piles.map(_centerStyleStr) }
  const refreshDraws = () => { drawsStyle.value = _draws.map(_centerStyleStr) }
  const refreshInners = () => { innersStyle.value = _inners.map(_innerStyleStr) }

  function setDrawCardSizes(layout: SceneLayoutResult) {
    drawsSizeStyle.value = Array.from({ length: opts.maxCardCount }, (_, index) => {
      const card = layout.cards[index]
      return _cardSizeStyleStr(card?.width ?? layout.cardWidth, card?.height ?? layout.cardHeight)
    })
    layoutCardWidth.value = layout.cardWidth
    layoutCardHeight.value = layout.cardHeight
  }

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
    pilesVisible.value = Array(opts.maxCutPiles).fill(false)
    _piles.forEach((state, index) => {
      Object.assign(state, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 10 + index })
    })
    refreshPiles()
  }

  function resetDrawVisualState() {
    drawsVisible.value = Array(opts.maxCardCount).fill(false)
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

  // Automatic style refresh: when GSAP mutates the plain state objects,
  // Vue watch(deep: true) tracks property mutations and triggers the corresponding refresh callbacks.
  watch(() => _bg, refreshBg, { deep: true, immediate: true })
  watch(() => _stage, refreshStage, { deep: true, immediate: true })
  watch(() => _header, refreshHeader, { deep: true, immediate: true })
  watch(() => _footer, refreshFooter, { deep: true, immediate: true })
  watch(() => _deckCtn, refreshDeckCtn, { deep: true, immediate: true })
  watch(() => _initials, refreshInitials, { deep: true, immediate: true })
  watch(() => _lefts, refreshLefts, { deep: true, immediate: true })
  watch(() => _rights, refreshRights, { deep: true, immediate: true })
  watch(() => _piles, refreshPiles, { deep: true, immediate: true })
  watch(() => _draws, refreshDraws, { deep: true, immediate: true })
  watch(() => _inners, refreshInners, { deep: true, immediate: true })

  function getAllTargets() {
    return [
      _bg, _stage, _header, _footer, _deckCtn,
      ..._initials, ..._lefts, ..._rights,
      ..._piles, ..._draws, ..._inners,
    ]
  }

  return {
    _bg, _stage, _header, _footer, _deckCtn,
    _initials, _lefts, _rights, _piles, _draws, _inners,
    leftsVisible, rightsVisible, pilesVisible, drawsVisible,
    layoutCardWidth, layoutCardHeight,
    bgStyle, stageStyle, headerStyle, footerStyle, deckCtnStyle,
    initialsStyle, leftsStyle, rightsStyle, pilesStyle,
    drawsStyle, drawsSizeStyle, innersStyle,
    overlayVarsStyle,
    refreshBg, refreshStage, refreshHeader, refreshFooter, refreshDeckCtn,
    refreshInitials, refreshLefts, refreshRights, refreshPiles, refreshDraws, refreshInners,
    resetShuffleVisualState, resetCutVisualState, resetDrawVisualState, resetInitialDeckState,
    setDrawCardSizes,
    getAllTargets,
  }
}
