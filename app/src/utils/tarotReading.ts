/**
 * 塔罗牌核心业务逻辑
 * 负责牌组加载、洗牌抽牌、结果判定
 */

import cupsData from '../data/tarot-cups.json'
import majorData from '../data/tarot-major.json'
import pentaclesData from '../data/tarot-pentacles.json'
import swordsData from '../data/tarot-swords.json'
import wandsData from '../data/tarot-wands.json'
import { TAROT_THEME_ASSET_BASE } from '../constants'

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
  result: 'yes' | 'no'  // 最终结果判定：yes=积极，no=消极
  score: number         // 最终得分（正数为积极，负数为消极）
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
// 大阿卡纳：./major/major_arcana_{序号}_{id}.jpeg
// 小阿卡纳：./minor/{花色}/minor_arcana_{花色}_{序号}_{nameEn}.jpeg
// 运行时统一从 TAROT_THEME_ASSET_BASE 构建路径，避免源码和产物路径策略不一致
function getCardImagePath(card: TarotCardSeed): string {
  if (card.type === 'major') {
    return `${TAROT_THEME_ASSET_BASE}/major/major_arcana_${String(card.number).padStart(2, '0')}_${card.id}.jpeg`
  }

  const suit = card.suit ?? ''
  const number_text = String(card.number).padStart(2, '0')
  const formatted_name = card.nameEn.toLowerCase().replace(/\s+/g, '_')

  return `${TAROT_THEME_ASSET_BASE}/minor/${suit}/minor_arcana_${suit}_${number_text}_${formatted_name}.jpeg`
}

// Fisher-Yates 洗牌算法 + 随机决定正逆位
export function drawThreeCards(allCards: TarotCardInfo[]): DrawnResult[] {
  const shuffled_cards = [...allCards].sort(() => Math.random() - 0.5)

  return shuffled_cards.slice(0, 3).map((card) => ({
    card,
    position: Math.random() > 0.5 ? 'upright' : 'reversed'
  }))
}

// 情感倾向基础权重映射
const SENTIMENT_BASE_WEIGHT: Record<string, number> = {
  positive: 3,
  negative: -3,
  neutral: 0
}

// 计算单张牌的权重得分
// 规则：
// 1. 基础权重：positive=+3, negative=-3, neutral=0
// 2. 正逆位加成：当牌面位置与情感倾向一致时，权重绝对值+2（强化），否则-1（削弱）
//    - 正位牌且upright为positive：+3+2=+5
//    - 正位牌且upright为negative：-3-1=-4（逆位含义被削弱）
//    - 逆位牌且reversed为negative：-3-2=-5（负面被强化）
//    - 逆位牌且reversed为positive：+3+1=+4（正面被削弱）
// 3. 大阿卡纳加成：大阿卡纳牌权重×1.3（四舍五入）
// 4. neutral牌特殊处理：正位时+1，逆位时-1（中性牌的位置决定倾向）
function getCardScore(drawn_card: DrawnResult): number {
  const { card, position } = drawn_card
  const meaning = position === 'upright' ? card.upright : card.reversed
  const sentiment = meaning.sentiment
  
  let score = SENTIMENT_BASE_WEIGHT[sentiment] ?? 0
  
  // neutral牌特殊处理：位置决定倾向
  if (sentiment === 'neutral') {
    score = position === 'upright' ? 1 : -1
  } else {
    // 正逆位与情感倾向一致性判断
    // 正位时看upright，逆位时看reversed
    const positionSentiment = position === 'upright' 
      ? card.upright.sentiment 
      : card.reversed.sentiment
    
    // 当位置与当前含义一致时强化，否则削弱
    if (positionSentiment === sentiment) {
      // 情感倾向与位置一致，强化
      score += sentiment === 'positive' ? 2 : -2
    } else {
      // 情感倾向与位置不一致，削弱（取相反方向的弱化值）
      score += sentiment === 'positive' ? -1 : 1
    }
  }
  
  // 大阿卡纳加成
  if (card.type === 'major') {
    score = Math.round(score * 1.3)
  }
  
  return score
}

// 根据 3 张牌的总分判定结果
// 规则：
// 1. 计算3张牌的总得分
// 2. 结果必须是积极或消极，不允许不明朗
// 3. 如果总分为0，则根据正位牌数量决定：正位多=积极，逆位多=消极，相等=积极（默认）
// 4. 最终返回：yes=积极，no=消极
export function generateReading(drawn_cards: DrawnResult[]): ReadingResult {
  const cardScores = drawn_cards.map(getCardScore)
  let total_score = cardScores.reduce((sum, score) => sum + score, 0)
  
  // 避免0分：如果总得分为0，根据正位牌数量决定
  if (total_score === 0) {
    const uprightCount = drawn_cards.filter(c => c.position === 'upright').length
    const reversedCount = drawn_cards.filter(c => c.position === 'reversed').length
    
    if (uprightCount > reversedCount) {
      total_score = 1  // 正位多，积极
    } else if (reversedCount > uprightCount) {
      total_score = -1  // 逆位多，消极
    } else {
      total_score = 1  // 相等，默认积极
    }
  }
  
  const result: ReadingResult['result'] = total_score > 0 ? 'yes' : 'no'
  
  return {
    result,
    score: total_score,
    cardDetails: drawn_cards.map((drawn_card) => ({
      card: drawn_card.card,
      position: drawn_card.position,
      meaning: drawn_card.position === 'upright'
        ? drawn_card.card.upright.meaning
        : drawn_card.card.reversed.meaning
    }))
  }
}
