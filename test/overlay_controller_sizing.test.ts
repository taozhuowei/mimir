// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { ReadingResult, TarotCardInfo } from '../app/src/utils/tarotReading'

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      fromTo: vi.fn().mockReturnThis(),
      to: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      kill: vi.fn(),
      clear: vi.fn(),
      timeScale: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      time: vi.fn(),
      seek: vi.fn(),
    })),
    to: vi.fn().mockReturnValue({ kill: vi.fn() }),
    killTweensOf: vi.fn(),
  },
  timeline: vi.fn(() => ({
    fromTo: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    kill: vi.fn(),
    clear: vi.fn(),
    timeScale: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    time: vi.fn(),
    seek: vi.fn(),
  })),
  to: vi.fn().mockReturnValue({ kill: vi.fn() }),
  killTweensOf: vi.fn(),
}))

vi.mock('../app/src/utils/spread_layout', () => ({
  resolveSpreadLayout: vi.fn(() => ({
    cardWidth: 172,
    cardHeight: 275,
    stageShiftY: 48,
    cards: [{ x: 0, y: 0, width: 172, height: 275 }],
  })),
}))

vi.mock('../app/src/api/readings', () => ({
  fetchReading: vi.fn().mockResolvedValue({
    result: 'positive',
    score: 3,
    cardDetails: [],
  }),
}))

function makeCard(): TarotCardInfo {
  return {
    id: 'test_card',
    name: 'Test Card',
    nameEn: 'Test Card',
    number: 0,
    type: 'major',
    image: '/test.jpg',
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

describe('use_overlay_controller result-zone sizing', () => {
  const windowHeight = 844
  const windowWidth = 390

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('uni', {
      getWindowInfo: () => ({
        windowWidth,
        windowHeight,
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
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  async function mountHarness(isWide = false) {
    const { useOverlayController } = await import('../app/src/composables/use_overlay_controller')

    const tarotStore = {
      spreadKind: 'single_card' as const,
      drawnCards: [{ card: makeCard(), position: 'upright' as const }],
      readingResult: null as ReadingResult | null,
      drawCards: vi.fn(),
      setPhase: vi.fn(),
      revealResult: vi.fn(),
      currentQuestion: 'Test question',
    }

    const themeStore = {
      cardBackImage: '',
      getUiAsset: vi.fn((name: string) => `/icons/${name}.png`),
    }

    let exposedController: ReturnType<typeof useOverlayController> | null = null

    const Harness = defineComponent({
      setup(_, { expose }) {
        const controller = useOverlayController({
          tarotStore: tarotStore as never,
          themeStore: themeStore as never,
          isWide: ref(isWide),
          cardCount: ref(1),
          emit: (() => undefined) as never,
        })
        exposedController = controller
        expose({ controller })
        return () => h('div')
      },
    })

    const wrapper = mount(Harness)
    await nextTick()

    return {
      wrapper,
      controller: exposedController!,
    }
  }

  it('returns empty resultZoneStyle when results not shown', async () => {
    const { controller } = await mountHarness()
    
    expect(controller.showResults.value).toBe(false)
    expect(controller.resultZoneStyle.value).toBe('')
  })

  it('provides resultZoneStyle when showResults is true', async () => {
    const { controller } = await mountHarness()
    
    // Simulate showing results
    controller.showResults.value = true
    await nextTick()
    
    // Result zone style should be computed with height
    expect(controller.resultZoneStyle.value).toContain('height:')
  })

  it('provides stageContainerStyle', async () => {
    const { controller } = await mountHarness()
    
    // Should provide stage container style
    expect(controller.stageContainerStyle.value).toBeDefined()
    expect(controller.stageContainerStyle.value).toContain('height:')
  })

  it('exposes reading error states through controller', async () => {
    const { controller } = await mountHarness()
    
    // Reading state properties should be exposed
    expect(controller.isReadingFailed).toBeDefined()
    expect(controller.isReadingLoading).toBeDefined()
    expect(controller.readingErrorMessage).toBeDefined()
    expect(controller.readingPanelState).toBeDefined()
    
    // These should be computed refs
    expect(controller.isReadingFailed.value).toBe(false)
    expect(controller.isReadingLoading.value).toBe(false)
  })

  it('provides retry functionality through controller', async () => {
    const { controller } = await mountHarness()
    
    expect(controller.retryReading).toBeTypeOf('function')
  })

  it('exposes overlayVarsStyle for CSS custom properties', async () => {
    const { controller } = await mountHarness()
    
    expect(controller.overlayVarsStyle).toBeDefined()
    expect(controller.overlayVarsStyle.value).toContain('--card-width:')
    expect(controller.overlayVarsStyle.value).toContain('--card-height:')
  })
})
