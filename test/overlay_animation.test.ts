// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadingResult, TarotCardInfo } from '../app/src/utils/tarotReading'

// Track all mock function calls
const pauseSpy = vi.fn()
const resumeSpy = vi.fn()
const timeScaleSpy = vi.fn()
const timeSpy = vi.fn()
const seekSpy = vi.fn()

// Global timeline mock - should never be called for local operations
const globalTimelineMock = {
  timeScale: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  time: vi.fn().mockReturnValue(0),
}

const killTweensOfMock = vi.fn()

// Store last created timeline for assertions
type MockTimeline = {
  pause: () => void
  resume: () => void
  timeScale: (n?: number) => number | void
  time: (n?: number) => number | void
  seek: (p: number | string) => void
  add: (item?: unknown, position?: number | string) => MockTimeline
  call: (fn: () => void, args?: unknown[], position?: number | string) => MockTimeline
  clear: () => MockTimeline
  kill: () => MockTimeline
  _isPaused: () => boolean
  _timeScale: () => number
  _currentTime: () => number
  _isMockTimeline: true
  _scheduledEvents: Array<{ callback: () => void; time: number }>
} 

let createdTimelines: MockTimeline[] = []
let masterTimelineRef: MockTimeline | null = null

const mockResolveSpreadLayout = vi.hoisted(() => vi.fn())

vi.mock('gsap', () => {
  function createTimeline(config?: { paused?: boolean; onComplete?: () => void }) {
    let currentTime = 0
    let isPaused = config?.paused ?? false
    let timeScale = 1
    let cursorTime = 0
    const scheduledTimers = new Set<ReturnType<typeof setTimeout>>()
    const scheduledEvents: Array<{ callback: () => void; time: number }> = []

    function clearScheduledTimers() {
      scheduledTimers.forEach((id) => clearTimeout(id as unknown as number))
      scheduledTimers.clear()
    }

    function resolvePosition(position?: number | string) {
      if (typeof position === 'number') {
        return position
      }

      if (typeof position === 'string' && position.startsWith('+=')) {
        return cursorTime + Number.parseFloat(position.slice(2))
      }

      return cursorTime
    }

    function scheduleEvent(time: number, callback: () => void) {
      const delay = Math.max(0, time * 1000)
      const timerId = setTimeout(() => {
        scheduledTimers.delete(timerId as unknown as ReturnType<typeof setTimeout>)
        if (!isPaused) {
          currentTime = time
          callback()
        }
      }, delay)
      scheduledTimers.add(timerId as unknown as ReturnType<typeof setTimeout>)
    }

    const timeline: MockTimeline = {
      pause() {
        pauseSpy()
        isPaused = true
        return this
      },
      resume() {
        resumeSpy()
        isPaused = false
        return this
      },
      timeScale(newScale?: number) {
        if (typeof newScale === 'number') {
          timeScaleSpy(newScale)
          timeScale = newScale
          return this
        }
        return timeScale
      },
      time(newTime?: number) {
        if (typeof newTime === 'number') {
          timeSpy(newTime)
          currentTime = Math.max(0, newTime)
          return this
        }
        return currentTime
      },
      seek(position: number | string) {
        seekSpy(position)
        if (typeof position === 'number') {
          currentTime = position
        }
        return this
      },
      to(_target?: unknown, vars?: { duration?: number }, position?: number | string) {
        const startTime = resolvePosition(position)
        cursorTime = Math.max(cursorTime, startTime + (vars?.duration ?? 0))
        return this
      },
      fromTo(_target?: unknown, _fromVars?: unknown, toVars?: { duration?: number }, position?: number | string) {
        const startTime = resolvePosition(position)
        cursorTime = Math.max(cursorTime, startTime + (toVars?.duration ?? 0))
        return this
      },
      add(item?: unknown, position?: number | string) {
        const startTime = resolvePosition(position)

        if (typeof item === 'function') {
          scheduledEvents.push({ callback: item, time: startTime })
          scheduleEvent(startTime, item)
          cursorTime = Math.max(cursorTime, startTime)
          return this
        }

        if (item && typeof item === 'object' && (item as MockTimeline)._isMockTimeline) {
          const childTimeline = item as MockTimeline
          childTimeline._scheduledEvents.forEach(({ callback, time }) => {
            const mergedTime = startTime + time
            scheduledEvents.push({ callback, time: mergedTime })
            scheduleEvent(mergedTime, callback)
          })
          cursorTime = Math.max(cursorTime, startTime)
        }

        return this
      },
      call(fn: () => void, _args?: unknown[], position?: number | string) {
        return this.add(fn, position)
      },
      kill() {
        clearScheduledTimers()
        return this
      },
      clear() {
        clearScheduledTimers()
        scheduledEvents.length = 0
        return this
      },
      progress() { return 0 },
      _isPaused: () => isPaused,
      _timeScale: () => timeScale,
      _currentTime: () => currentTime,
      _isMockTimeline: true,
      _scheduledEvents: scheduledEvents,
    }

    createdTimelines.push(timeline)
    if (!masterTimelineRef) {
      masterTimelineRef = timeline
    }
    return timeline
  }

  function to(target: Record<string, number>, vars: Record<string, unknown>) {
    if ('value' in target && typeof vars.value === 'number') {
      target.value = vars.value
    }
    if (typeof vars.onUpdate === 'function') {
      vars.onUpdate()
    }
    return { kill: vi.fn() }
  }

  return {
    default: {
      timeline: createTimeline,
      to,
      killTweensOf: killTweensOfMock,
      globalTimeline: globalTimelineMock,
    },
    timeline: createTimeline,
    to,
    killTweensOf: killTweensOfMock,
    globalTimeline: globalTimelineMock,
  }
})

vi.mock('../app/src/utils/spread_layout', () => ({
  resolveSpreadLayout: mockResolveSpreadLayout,
}))

// Track active setTimeout timers
const activeTimers = new Set<ReturnType<typeof setTimeout>>()
const originalSetTimeout = globalThis.setTimeout
const originalSetInterval = globalThis.setInterval

globalThis.setTimeout = ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
  const id = originalSetTimeout(fn, delay, ...args)
  activeTimers.add(id as unknown as ReturnType<typeof setTimeout>)
  return id
}) as typeof globalThis.setTimeout

globalThis.setInterval = ((fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
  const id = originalSetInterval(fn, delay, ...args)
  activeTimers.add(id as unknown as ReturnType<typeof setInterval>)
  return id
}) as typeof globalThis.setInterval

function clearActiveTimers() {
  activeTimers.forEach((id) => clearTimeout(id as unknown as number))
  activeTimers.clear()
}

function makeCard(): TarotCardInfo {
  return {
    id: 'test_card',
    name: 'Test Card',
    nameEn: 'Test Card',
    number: 0,
    type: 'major',
    image: 'http://localhost:3000/static/themes/golden_dawn/tarot/major/major_arcana_00_test_card.jpeg',
    upright: {
      keywords: ['test'],
      meaning: 'Test upright meaning',
      sentiment: 'positive',
    },
    reversed: {
      keywords: ['test reversed'],
      meaning: 'Test reversed meaning',
      sentiment: 'negative',
    },
  }
}

function makeReadingResult(): ReadingResult {
  return {
    result: 'positive',
    score: 3,
    cardDetails: [
      {
        card: makeCard(),
        position: 'upright',
        meaning: 'Test meaning',
      },
    ],
  }
}

describe('use_overlay_animation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearActiveTimers()
    createdTimelines = []
    masterTimelineRef = null
    pauseSpy.mockClear()
    resumeSpy.mockClear()
    timeScaleSpy.mockClear()
    timeSpy.mockClear()
    seekSpy.mockClear()
    globalTimelineMock.timeScale.mockClear()
    globalTimelineMock.pause.mockClear()
    globalTimelineMock.resume.mockClear()
    globalTimelineMock.time.mockClear().mockReturnValue(0)
    killTweensOfMock.mockClear()
    mockResolveSpreadLayout.mockImplementation(({ containerWidth, containerHeight }: { containerWidth: number; containerHeight: number }) => ({
      cardWidth: 172,
      cardHeight: 275,
      stageShiftY: 48,
      cards: [
        {
          x: 0,
          y: Math.round(containerHeight * 0.1),
          width: 172,
          height: 275,
        },
      ],
    }))

    vi.stubGlobal('uni', {
      getWindowInfo: () => ({
        windowWidth: 390,
        windowHeight: 844,
      }),
      onWindowResize: vi.fn(),
      offWindowResize: vi.fn(),
      getMenuButtonBoundingClientRect: () => ({
        top: 12,
        height: 32,
      }),
    })
  })

  afterEach(() => {
    clearActiveTimers()
    lastTimeline = null
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  async function mountHarness() {
    const { useOverlayAnimation } = await import('../app/src/composables/use_overlay_animation')

    const tarotStore = {
      spreadKind: 'single_card',
      drawnCards: [
        {
          card: makeCard(),
          position: 'upright' as const,
        },
      ],
      readingResult: null,
      drawCards: vi.fn(),
      setPhase: vi.fn(),
      startReadingRequest: vi.fn().mockResolvedValue(makeReadingResult()),
      waitForReadingResult: vi.fn().mockResolvedValue(makeReadingResult()),
      revealResult: vi.fn(),
    }

    const themeStore = {
      cardBackImage: '',
    }

    let exposedAnimation: ReturnType<typeof useOverlayAnimation> | null = null

    const Harness = defineComponent({
      setup(_, { expose }) {
        const anim = useOverlayAnimation({
          tarotStore: tarotStore as never,
          themeStore: themeStore as never,
          isWide: ref(false),
          cardCount: ref(1),
          emit: (() => undefined) as never,
        })

        exposedAnimation = anim
        expose({ anim })
        return () => h('div')
      },
    })

    const wrapper = mount(Harness)
    await nextTick()

    return {
      wrapper,
      tarotStore,
      anim: exposedAnimation!,
    }
  }

  it('uses local master timeline instead of globalTimeline for pause/resume', async () => {
    const { anim } = await mountHarness()

    await nextTick()

    // Verify timeline was created
    expect(masterTimelineRef).not.toBeNull()

    // Test pause - should affect local timeline
    anim.pauseAnimations()
    expect(anim.isPaused.value).toBe(true)
    expect(masterTimelineRef!._isPaused()).toBe(true)
    expect(pauseSpy).toHaveBeenCalled()
    // globalTimeline.pause should NOT be called anymore
    expect(globalTimelineMock.pause).not.toHaveBeenCalled()

    // Test resume
    anim.resumeAnimations()
    expect(anim.isPaused.value).toBe(false)
    expect(masterTimelineRef!._isPaused()).toBe(false)
    expect(resumeSpy).toHaveBeenCalled()
    // globalTimeline.resume should NOT be called anymore
    expect(globalTimelineMock.resume).not.toHaveBeenCalled()
  })

  it('sets playback rate on local master timeline instead of global', async () => {
    const { anim } = await mountHarness()

    await nextTick()

    expect(masterTimelineRef).not.toBeNull()

    anim.setPlaybackRate(2)
    expect(anim.playbackRate.value).toBe(2)
    expect(masterTimelineRef!._timeScale()).toBe(2)
    expect(timeScaleSpy).toHaveBeenCalledWith(2)
    // globalTimeline.timeScale should NOT be called anymore
    expect(globalTimelineMock.timeScale).not.toHaveBeenCalled()
  })

  it('keeps drawing phase before the additional reveal delay elapses', async () => {
    const { anim, tarotStore } = await mountHarness()

    anim.replayFromPhase('drawing')
    expect(anim.phase.value).toBe('drawing')

    await vi.advanceTimersByTimeAsync(0)
    expect(tarotStore.drawCards).toHaveBeenCalledTimes(1)
    // Reading request is now handled by reading orchestrator - just verify it progresses

    await vi.advanceTimersByTimeAsync(6200)
    expect(anim.phase.value).toBe('drawing')

    await vi.advanceTimersByTimeAsync(250)
    expect(anim.phase.value).toBe('revealing')
    expect(tarotStore.setPhase).toHaveBeenCalledWith('revealing')
  })

  it('can replay directly from revealing phase for dev tools', async () => {
    const { anim, tarotStore } = await mountHarness()

    anim.replayFromPhase('revealing')
    expect(anim.phase.value).toBe('revealing')
    expect(tarotStore.setPhase).toHaveBeenCalledWith('revealing')
    expect(tarotStore.drawCards).not.toHaveBeenCalled()
  })

  it('blocks phase advancement when paused', async () => {
    const { anim, tarotStore } = await mountHarness()

    anim.replayFromPhase('drawing')
    expect(anim.phase.value).toBe('drawing')

    await nextTick()

    expect(masterTimelineRef).not.toBeNull()

    anim.pauseAnimations()
    expect(anim.isPaused.value).toBe(true)
    expect(masterTimelineRef!._isPaused()).toBe(true)

    // Phase should still be 'drawing' because timeline is paused
    expect(anim.phase.value).toBe('drawing')
    expect(tarotStore.setPhase).not.toHaveBeenCalledWith('revealing')

    // Resume
    anim.resumeAnimations()
    expect(anim.isPaused.value).toBe(false)
    expect(masterTimelineRef!._isPaused()).toBe(false)
  })

  it('steps forward by 1/60s when calling stepForward()', async () => {
    const { anim } = await mountHarness()

    await nextTick()

    expect(masterTimelineRef).not.toBeNull()

    const initialTime = masterTimelineRef!._currentTime()

    anim.stepForward()

    expect(timeSpy).toHaveBeenCalled()
    // Verify time increased (approximate due to 1/60 = 0.0167)
    expect(masterTimelineRef!._currentTime()).toBeGreaterThan(initialTime)
    expect(masterTimelineRef!._currentTime() - initialTime).toBeCloseTo(1 / 60, 3)
  })

  it('steps backward by 1/60s when calling stepBackward()', async () => {
    const { anim } = await mountHarness()

    await nextTick()

    expect(masterTimelineRef).not.toBeNull()

    // First set time to 5
    masterTimelineRef!.time(5)
    const initialTime = masterTimelineRef!._currentTime()
    expect(initialTime).toBe(5)

    // Clear spy calls from the setup
    timeSpy.mockClear()

    anim.stepBackward()

    expect(timeSpy).toHaveBeenCalled()
    const newTime = masterTimelineRef!._currentTime()
    expect(newTime).toBeLessThan(initialTime)
    expect(initialTime - newTime).toBeCloseTo(1 / 60, 3)

    // Test boundary: time should not go below 0
    masterTimelineRef!.time(0.01)
    timeSpy.mockClear()
    anim.stepBackward()
    expect(masterTimelineRef!._currentTime()).toBe(0)
  })

  it('seeks to specific time when calling seek()', async () => {
    const { anim } = await mountHarness()

    await nextTick()

    expect(masterTimelineRef).not.toBeNull()

    const seekPosition = 3.5
    anim.seek(seekPosition)

    expect(seekSpy).toHaveBeenCalledWith(seekPosition)
    expect(masterTimelineRef!._currentTime()).toBe(seekPosition)
  })

  it('maintains isolated control between local and global timelines', async () => {
    const { anim } = await mountHarness()

    await nextTick()

    expect(masterTimelineRef).not.toBeNull()

    // Perform operations on the local timeline
    anim.setPlaybackRate(0.5)
    anim.pauseAnimations()
    anim.seek(4)

    // Verify local timeline state
    expect(masterTimelineRef!._timeScale()).toBe(0.5)
    expect(masterTimelineRef!._isPaused()).toBe(true)

    // Verify globalTimeline was never affected
    expect(globalTimelineMock.timeScale).not.toHaveBeenCalled()
    expect(globalTimelineMock.pause).not.toHaveBeenCalled()
    expect(globalTimelineMock.time).not.toHaveBeenCalled()

    // Resume and verify still isolated
    anim.resumeAnimations()
    expect(masterTimelineRef!._isPaused()).toBe(false)
    expect(globalTimelineMock.resume).not.toHaveBeenCalled()
  })
})
