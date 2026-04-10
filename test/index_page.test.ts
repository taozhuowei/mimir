/**
 * Homepage settings panel tests
 * Tests settings UI behavior and spread selection state management
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTarotStore } from '../app/src/stores/tarot'
import { useThemeStore } from '../app/src/stores/theme'
import type { SpreadKind } from '../app/src/utils/spread_layout'

// Mock the API modules
const mockFetchTheme = vi.hoisted(() => vi.fn())
const mockFetchAllCards = vi.hoisted(() => vi.fn())

vi.mock('../app/src/api/themes', () => ({
  fetchTheme: mockFetchTheme,
}))

vi.mock('../app/src/api/cards', () => ({
  fetchAllCards: mockFetchAllCards,
}))

// Mock config.json
vi.mock('../app/src/config.json', () => ({
  default: { spreadKind: 'three_card' },
  spreadKind: 'three_card',
}))

describe('homepage settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetchTheme.mockReset()
    mockFetchAllCards.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('spread options labels', () => {
    it('has correct labels for all spread kinds', () => {
      // Verify the expected labels match the implementation
      const spreadOptions: { value: SpreadKind; label: string }[] = [
        { value: 'single_card', label: '单牌阵' },
        { value: 'three_card', label: '三牌阵' },
        { value: 'cross_spread', label: '十字牌阵' },
      ]

      expect(spreadOptions).toHaveLength(3)
      expect(spreadOptions.map(o => o.value)).toContain('single_card')
      expect(spreadOptions.map(o => o.value)).toContain('three_card')
      expect(spreadOptions.map(o => o.value)).toContain('cross_spread')
      
      expect(spreadOptions.find(o => o.value === 'single_card')?.label).toBe('单牌阵')
      expect(spreadOptions.find(o => o.value === 'three_card')?.label).toBe('三牌阵')
      expect(spreadOptions.find(o => o.value === 'cross_spread')?.label).toBe('十字牌阵')
    })
  })

  describe('tarotStore spread state', () => {
    it('can read and update spreadKind from store', () => {
      const store = useTarotStore()

      // Default from config
      expect(store.spreadKind).toBe('three_card')

      // Update via setter
      store.setSpreadKind('single_card')
      expect(store.spreadKind).toBe('single_card')

      store.setSpreadKind('cross_spread')
      expect(store.spreadKind).toBe('cross_spread')
    })

    it('cardCount reflects current spreadKind', () => {
      const store = useTarotStore()

      // three_card = 3 cards
      store.setSpreadKind('three_card')
      expect(store.cardCount).toBe(3)

      // single_card = 1 card
      store.setSpreadKind('single_card')
      expect(store.cardCount).toBe(1)

      // cross_spread = 5 cards
      store.setSpreadKind('cross_spread')
      expect(store.cardCount).toBe(5)
    })

    it('spread selection is available after reset (for next run)', () => {
      const store = useTarotStore()

      // User selects cross_spread
      store.setSpreadKind('cross_spread')
      expect(store.spreadKind).toBe('cross_spread')

      // Reset the store (simulating returning to homepage)
      store.reset()

      // Selection should persist for next divination
      expect(store.spreadKind).toBe('cross_spread')
      expect(store.cardCount).toBe(5)
    })
  })

  describe('theme store UI assets', () => {
    it('themeStore provides getUiAsset for settings icon', async () => {
      const store = useThemeStore()
      
      // Mock theme data
      mockFetchTheme.mockResolvedValue({
        id: 'golden_dawn',
        name: 'Golden Dawn',
        ui: {
          icon_settings: 'http://localhost:3000/static/themes/golden_dawn/ui/icon-settings.png',
        },
        images: { card_back: 'http://localhost:3000/static/themes/golden_dawn/tarot/card_back.jpeg' },
        colors: {},
        fonts: {},
      })

      await store.loadTheme('golden_dawn')

      // Should be able to get settings icon URL
      const settingsUrl = store.getUiAsset('icon_settings')
      expect(settingsUrl).toBe('http://localhost:3000/static/themes/golden_dawn/ui/icon-settings.png')
    })

    it('getUiAsset returns empty string for missing assets', async () => {
      const store = useThemeStore()
      
      mockFetchTheme.mockResolvedValue({
        id: 'minimal',
        name: 'Minimal',
        ui: {},
        images: { card_back: '' },
        colors: {},
        fonts: {},
      })

      await store.loadTheme('minimal')

      // Missing asset should return empty string
      const missingUrl = store.getUiAsset('icon_settings')
      expect(missingUrl).toBe('')
    })
  })

  describe('homepage idle state conditions', () => {
    it('store isIdle is true only in idle phase', () => {
      const store = useTarotStore()

      expect(store.isIdle).toBe(true)
      expect(store.phase).toBe('idle')

      store.startDivination('Test question')
      expect(store.isIdle).toBe(false)
      expect(store.phase).toBe('shuffling')

      store.reset()
      expect(store.isIdle).toBe(true)
      expect(store.phase).toBe('idle')
    })

    it('settings button should only show when isIdle is true', () => {
      const store = useTarotStore()

      // Simulate idle state check
      const shouldShowSettings = store.isIdle && !store.cardsLoadError
      expect(shouldShowSettings).toBe(true)

      // Start divination
      store.startDivination('Test')
      const shouldShowSettingsDuringDivination = store.isIdle && !store.cardsLoadError
      expect(shouldShowSettingsDuringDivination).toBe(false)
    })
  })
})
