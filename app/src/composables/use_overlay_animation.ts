/**
 * Name: use_overlay_animation
 * Purpose: COMPATIBILITY SHIM - delegates to use_overlay_controller.
 * Reason: maintain backward compatibility with existing imports while migrating to new architecture.
 * NOTE: This file is deprecated. Use use_overlay_controller for new code.
 */

import type { Ref } from 'vue'
import { useTarotStore } from '../stores/tarot'
import { useThemeStore } from '../stores/theme'
import { useOverlayController } from './use_overlay_controller'
import type { OverlayPhase } from '../utils/overlay_animations/types'

export function useOverlayAnimation(deps: {
  tarotStore: ReturnType<typeof useTarotStore>
  themeStore: ReturnType<typeof useThemeStore>
  isWide: Ref<boolean>
  cardCount: Ref<number>
  emit: ((event: 'complete') => void) & ((event: 'restart') => void)
}) {
  const controller = useOverlayController(deps)

  // Map controller output to legacy interface
  return {
    // Styles (unwrap refs for compatibility)
    stageContainerStyle: controller.stageContainerStyle,
    resultZoneStyle: controller.resultZoneStyle,
    bgStyle: controller.bgStyle,
    stageStyle: controller.stageStyle,
    headerStyle: controller.headerStyle,
    footerStyle: controller.footerStyle,
    deckCtnStyle: controller.deckCtnStyle,
    initialsStyle: controller.initialsStyle,
    leftsStyle: controller.leftsStyle,
    rightsStyle: controller.rightsStyle,
    leftsVisible: controller.leftsVisible,
    rightsVisible: controller.rightsVisible,
    cutTopStyle: controller.cutTopStyle,
    cutMidStyle: controller.cutMidStyle,
    cutBotStyle: controller.cutBotStyle,
    cutTopVisible: controller.cutTopVisible,
    cutMidVisible: controller.cutMidVisible,
    cutBotVisible: controller.cutBotVisible,
    drawsStyle: controller.drawsStyle,
    drawsSizeStyle: controller.drawsSizeStyle,
    innersStyle: controller.innersStyle,
    drawsVisible: controller.drawsVisible,
    overlayVarsStyle: controller.overlayVarsStyle,

    // State
    showResults: controller.showResults,
    phase: controller.phase,
    entryAnimationComplete: controller.entryAnimationComplete,
    layoutCardWidth: controller.layoutCardWidth,
    layoutCardHeight: controller.layoutCardHeight,
    playbackRate: controller.playbackRate,
    isPaused: controller.isPaused,

    // Reading state (mapped from new orchestrator)
    readingPanelState: controller.readingPanelState,
    readingErrorMessage: controller.readingErrorMessage,
    isReadingFailed: controller.isReadingFailed,
    isReadingLoading: controller.isReadingLoading,
    retryReading: controller.retryReading,

    // Content
    cardBack: controller.cardBack,
    getCardImg: controller.getCardImg,

    // Controls
    setPlaybackRate: controller.setPlaybackRate,
    pauseAnimations: controller.pauseAnimations,
    resumeAnimations: controller.resumeAnimations,
    stepForward: controller.stepForward,
    stepBackward: controller.stepBackward,
    seek: controller.seek,
    replayFromPhase: controller.replayFromPhase,
    restart: controller.restart,
  }
}

// Re-export types for compatibility
export type { OverlayPhase }
