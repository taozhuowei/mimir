/**
 * 塔罗牌核心业务逻辑
 * 负责牌组加载、洗牌抽牌、结果判定
 */

import cupsData from '../data/tarot-cups.json'
import majorData from '../data/tarot-major.json'
import pentaclesData from '../data/tarot-pentacles.json'
import swordsData from '../data/tarot-swords.json'
import wandsData from '../data/tarot-wands.json'

export interface TarotCardMeaning {
  keywords: string[]      // 关键词列表（用于快速理解牌意）
  meaning: string         // 详细解读文案
  sentiment: 'positive' | 'negative' | 'neutral'  // 情感倾向（用于计分）
}

export interface TarotCardInfo {
  id: string
  name: string            // 中文名称
  nameEn: string          // 英文名称（用于构建图片路径）
  number: number          // 牌序号（大阿卡纳 0-21，小阿卡纳 1-14）
  type: 'major' | 'minor' // 大/小阿卡纳
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'  // 小阿卡纳花色
  image: string           // 图片路径（运行时由 getCardImagePath 动态构建）
  upright: TarotCardMeaning   // 正位含义
  reversed: TarotCardMeaning  // 逆位含义
}

export interface DrawnResult {
  card: TarotCardInfo
  position: 'upright' | 'reversed'  // upright=正位（牌面正向），reversed=逆位（牌面倒置，含义通常相反）
}

export interface ReadingResult {
  result: 'yes' | 'no' | 'uncertain'  // 最终结果判定
  cardDetails: Array<{
    card: TarotCardInfo
    position: 'upright' | 'reversed'
    meaning: string  // 根据正/逆位取对应含义
  }>
}

// 原始牌数据类型：JSON 中不存储图片路径（image 可选），通过 getCardImagePath 运行时构建
type TarotCardSeed = Omit<TarotCardInfo, 'image'> & {
  image?: string
}

// 补全卡片的 image 字段（将 JSON 数据转换为完整卡片对象）
function normalizeCard(seed: TarotCardSeed): TarotCardInfo {
  return {
    ...seed,
    image: getCardImagePath(seed)
  }
}

// 从 5 个 JSON 文件加载全部 78 张牌
// 注意：大阿卡纳结构为直接数组，小阿卡纳需取 .cards 子数组
export function loadAllCards(): TarotCardInfo[] {
  const seeds: TarotCardSeed[] = [
    ...(majorData.majorArcana as TarotCardSeed[]),
    ...(wandsData.wands.cards as TarotCardSeed[]),
    ...(cupsData.cups.cards as TarotCardSeed[]),
    ...(swordsData.swords.cards as TarotCardSeed[]),
    ...(pentaclesData.pentacles.cards as TarotCardSeed[])
  ]

  return seeds.map(normalizeCard)
}

// 构建卡片图片路径
// 大阿卡纳：/major/major_arcana_{序号}_{id}.jpeg
// 小阿卡纳：/minor/{花色}/minor_arcana_{花色}_{序号}_{nameEn}.jpeg
function getCardImagePath(card: TarotCardSeed): string {
  const theme_id = 'golden_dawn'

  if (card.type === 'major') {
    return `/static/themes/${theme_id}/tarot/major/major_arcana_${String(card.number).padStart(2, '0')}_${card.id}.jpeg`
  }

  const suit = card.suit ?? ''
  const number_text = String(card.number).padStart(2, '0')
  const formatted_name = card.nameEn.toLowerCase().replace(/\s+/g, '_')

  return `/static/themes/${theme_id}/tarot/minor/${suit}/minor_arcana_${suit}_${number_text}_${formatted_name}.jpeg`
}

// Fisher-Yates 洗牌算法 + 随机决定正逆位
export function drawThreeCards(allCards: TarotCardInfo[]): DrawnResult[] {
  const shuffled_cards = [...allCards].sort(() => Math.random() - 0.5)

  return shuffled_cards.slice(0, 3).map((card) => ({
    card,
    position: Math.random() > 0.5 ? 'upright' : 'reversed'
  }))
}

// 单张牌计分：positive=+1, negative=-1, neutral=0
// 正位取 upright.sentiment，逆位取 reversed.sentiment
function getCardScore(drawn_card: DrawnResult): number {
  const sentiment = drawn_card.position === 'upright'
    ? drawn_card.card.upright.sentiment
    : drawn_card.card.reversed.sentiment

  switch (sentiment) {
    case 'positive':
      return 1
    case 'negative':
      return -1
    default:
      return 0
  }
}

// 根据 3 张牌的总分判定结果：>0=yes, <0=no, =0=uncertain
export function generateReading(drawn_cards: DrawnResult[]): ReadingResult {
  const total_score = drawn_cards
    .map(getCardScore)
    .reduce((sum, score) => sum + score, 0)

  let result: ReadingResult['result']

  if (total_score > 0) {
    result = 'yes'
  } else if (total_score < 0) {
    result = 'no'
  } else {
    result = 'uncertain'
  }

  return {
    result,
    cardDetails: drawn_cards.map((drawn_card) => ({
      card: drawn_card.card,
      position: drawn_card.position,
      meaning: drawn_card.position === 'upright'
        ? drawn_card.card.upright.meaning
        : drawn_card.card.reversed.meaning
    }))
  }
}
