/**
 * Name: flows/base/composables/animations/use_playback
 * Purpose: GSAP timeline playback controls — resume/seek/rate + timeline clear/kill.
 * Reason: extracted from use_animation_controller to isolate playback concerns.
 * Data flow: self-contained; creates TimelineOrchestrator internally.
 */

import { ref } from 'vue'
import { createTimelineOrchestrator } from '../../../../core/gsap/timeline'
import type { TimelineOrchestrator } from '../../../../core/gsap/timeline'

export function usePlayback() {
  const playbackRate = ref(1)
  const orchestrator: TimelineOrchestrator = createTimelineOrchestrator(false)

  function setPlaybackRate(rate: number) {
    playbackRate.value = rate
    orchestrator.setPlaybackRate(rate)
  }
  function resumeAnimations() { orchestrator.resume() }
  function seek(position: number | string) { orchestrator.seek(position) }

  return {
    playbackRate, orchestrator,
    setPlaybackRate, resumeAnimations, seek,
    clearTimeline: () => orchestrator.clear(),
    killTimeline: () => orchestrator.kill(),
  }
}
