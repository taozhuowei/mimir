/**
 * 主题系统 - 与 UI 完全解耦
 * 通过 CSS 变量注入色彩，通过 store 管理牌面资源路径
 */
import goldenDawn from './golden_dawn.json'

export interface ThemeConfig {
  id: string
  name: string
  description: string
  price: number
  isDefault: boolean
  preview: string
  colors: Record<string, string>
  fonts: Record<string, string>
  cards: {
    card_back: string
    major_arcana_dir: string
    minor_arcana: {
      wands: string
      cups: string
      swords: string
      pentacles: string
    }
  }
}

/** 所有已注册的主题 */
const themes: Map<string, ThemeConfig> = new Map()
themes.set('golden_dawn', goldenDawn as ThemeConfig)

/** 获取所有可用主题列表 */
export function getAvailableThemes(): ThemeConfig[] {
  return Array.from(themes.values())
}

/** 获取指定主题配置 */
export function getTheme(themeId: string): ThemeConfig | undefined {
  return themes.get(themeId)
}

/** 应用主题 - 注入 CSS 变量到根元素 */
export function applyTheme(themeId: string): boolean {
  const theme = themes.get(themeId)
  if (!theme) return false

  const root = document.documentElement

  // 注入色彩变量
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  // 注入字体变量
  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  return true
}

/** 根据主题和卡牌 ID 获取卡牌图片路径 */
export function getCardImagePath(themeId: string, cardId: string): string {
  const theme = themes.get(themeId)
  if (!theme) return ''

  // cardId 格式: major_arcana_XX_name 或 minor_arcana_suit_XX_name
  if (cardId.startsWith('major_arcana_')) {
    return `${theme.cards.major_arcana_dir}${cardId}.jpeg`
  }

  const suitMatch = cardId.match(/^minor_arcana_(wands|cups|swords|pentacles)_/)
  if (suitMatch) {
    const suit = suitMatch[1] as keyof typeof theme.cards.minor_arcana
    return `${theme.cards.minor_arcana[suit]}${cardId}.jpeg`
  }

  return ''
}

/** 获取牌背图片路径 */
export function getCardBackPath(themeId: string): string {
  const theme = themes.get(themeId)
  return theme?.cards.card_back ?? ''
}
