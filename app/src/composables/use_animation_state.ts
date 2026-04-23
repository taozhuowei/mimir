/**
 * Name: use_animation_state
 * Purpose: own all GSAP target objects, visibility flags, style refs, refresh callbacks, and per-group reset functions.
 * Reason: separates animation state management from the overlay controller for better modularity.
 * Data flow: receives layout results and options; returns reactive styles, states, and helpers.
 */

import { createAnimationState } from '../animation/engine/animation_state'
import { createStyleReconciler } from '../animation/engine/style_reconciler'
import { createVisibilityController } from '../animation/engine/visibility_controller'
import { getAllTargets } from '../animation/engine/gsap_adapter'

export function useAnimationState(opts: {
  deckCount: number
  shuffleHalfCount: number
  maxCutPiles: number
  maxCardCount: number
}) {
  const state = createAnimationState(opts)
  const reconciler = createStyleReconciler(state, {
    shuffleHalfCount: opts.shuffleHalfCount,
    maxCutPiles: opts.maxCutPiles,
    maxCardCount: opts.maxCardCount,
  })
  const visibility = createVisibilityController({
    shuffleHalfCount: opts.shuffleHalfCount,
    maxCutPiles: opts.maxCutPiles,
    maxCardCount: opts.maxCardCount,
  })

  function resetShuffleVisualState() {
    state.resetShuffleVisualState()
    visibility.resetShuffleVisualState()
  }

  function resetCutVisualState() {
    state.resetCutVisualState()
    visibility.resetCutVisualState()
  }

  function resetDrawVisualState() {
    state.resetDrawVisualState()
    visibility.resetDrawVisualState()
  }

  return {
    _bg: state._bg,
    _stage: state._stage,
    _header: state._header,
    _footer: state._footer,
    _deckCtn: state._deckCtn,
    _initials: state._initials,
    _lefts: state._lefts,
    _rights: state._rights,
    _piles: state._piles,
    _draws: state._draws,
    _inners: state._inners,
    leftsVisible: visibility.leftsVisible,
    rightsVisible: visibility.rightsVisible,
    pilesVisible: visibility.pilesVisible,
    drawsVisible: visibility.drawsVisible,
    layoutCardWidth: reconciler.layoutCardWidth,
    layoutCardHeight: reconciler.layoutCardHeight,
    bgStyle: reconciler.bgStyle,
    stageStyle: reconciler.stageStyle,
    headerStyle: reconciler.headerStyle,
    footerStyle: reconciler.footerStyle,
    deckCtnStyle: reconciler.deckCtnStyle,
    initialsStyle: reconciler.initialsStyle,
    leftsStyle: reconciler.leftsStyle,
    rightsStyle: reconciler.rightsStyle,
    pilesStyle: reconciler.pilesStyle,
    drawsStyle: reconciler.drawsStyle,
    drawsSizeStyle: reconciler.drawsSizeStyle,
    innersStyle: reconciler.innersStyle,
    overlayVarsStyle: reconciler.overlayVarsStyle,
    refreshBg: reconciler.refreshBg,
    refreshStage: reconciler.refreshStage,
    refreshHeader: reconciler.refreshHeader,
    refreshFooter: reconciler.refreshFooter,
    refreshDeckCtn: reconciler.refreshDeckCtn,
    refreshInitials: reconciler.refreshInitials,
    refreshLefts: reconciler.refreshLefts,
    refreshRights: reconciler.refreshRights,
    refreshPiles: reconciler.refreshPiles,
    refreshDraws: reconciler.refreshDraws,
    refreshInners: reconciler.refreshInners,
    resetShuffleVisualState,
    resetCutVisualState,
    resetDrawVisualState,
    resetInitialDeckState: state.resetInitialDeckState,
    setDrawCardSizes: reconciler.setDrawCardSizes,
    getAllTargets: () => getAllTargets(state),
  }
}
