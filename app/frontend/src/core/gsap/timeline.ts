/**
 * Name: core/gsap/timeline
 * Purpose: GSAP master-timeline orchestrator — create a timeline and expose
 *   playback control (resume/seek/rate/clear/kill/add).
 * Reason: centralize GSAP timeline lifecycle so the rest of the system never
 *   touches gsap.core.Timeline directly.
 * Data flow: paused flag in; orchestrator controls out.
 */

// Tree-shaking note: this resolves to gsap-core.js via Vite alias, which is
// already the minimal build without CSSPlugin/DOM-only APIs. Individual
// function exports (to, timeline, killTweensOf) are not available from
// gsap-core. Issue mitigated by gsap-core alias.
import gsap from 'gsap'

/* ── TimelineOrchestrator ─────────────────────────────────────────── */

export interface TimelineOrchestrator {
  readonly timeline: gsap.core.Timeline
  readonly playbackRate: number
  resume(): void
  setPlaybackRate(rate: number): void
  seek(position: number | string): void
  clear(): void
  kill(): void
  add(child: gsap.core.Timeline, position?: number | string): gsap.core.Timeline
}

export function createTimelineOrchestrator(
  paused: boolean = false,
): TimelineOrchestrator {
  const masterTimeline = gsap.timeline({ paused })
  let currentPlaybackRate = 1

  return {
    get timeline() {
      return masterTimeline
    },
    get playbackRate() {
      return currentPlaybackRate
    },
    resume() {
      masterTimeline.resume()
    },
    setPlaybackRate(rate: number) {
      currentPlaybackRate = rate
      masterTimeline.timeScale(rate)
    },
    seek(position: number | string) {
      masterTimeline.seek(position)
    },
    clear() {
      // Recursively kill child timelines and tweens before clearing to prevent
      // orphaned onUpdate callbacks from leaking memory.
      const children = masterTimeline.getChildren(true, true, true)
      children.forEach((child) => {
        if (typeof (child as gsap.core.Timeline).kill === 'function') {
          ;(child as gsap.core.Timeline).kill()
        }
      })
      masterTimeline.clear()
      masterTimeline.time(0)
    },
    kill() {
      masterTimeline.kill()
    },
    add(child: gsap.core.Timeline, position?: number | string) {
      return masterTimeline.add(child, position)
    },
  }
}
