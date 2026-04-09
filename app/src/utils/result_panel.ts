/**
 * ResultPanel helpers
 * 负责结果页文案映射与摘要生成，便于单元测试和页面复用。
 */

import type { ReadingResult } from './tarotReading'

// 结果类型的中文标签映射：yes/no → 积极/消极
const RESULT_INDICATION_MAP: Record<ReadingResult['result'], string> = {
  positive: '积极',
  negative: '消极'
}

// 摘要首句映射：根据结果类型生成引导语
const SUMMARY_LEAD_MAP: Record<ReadingResult['result'], string> = {
  positive: '当前牌面传递出积极信号',
  negative: '当前牌面传递出谨慎信号'
}

// 生成结果陈述句："塔罗牌根据您的问题呈现出{积极/消极}的指示。"
export function getResultStatement(result: ReadingResult['result']): string {
  return `塔罗牌根据您的问题呈现出${RESULT_INDICATION_MAP[result]}的指示。`
}

// 生成摘要文本：取前两张牌含义的第一句话，拼接在引导语后
// 切分逻辑：按中文标点（。?!）分割，取首句
export function getSummaryText(reading_result: ReadingResult): string {
  const fragments = reading_result.cardDetails
    .map((detail) => detail.meaning)
    .map((meaning) => meaning.split(/[。？！]/)[0]?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 2)

  if (fragments.length === 0) {
    return SUMMARY_LEAD_MAP[reading_result.result]
  }

  return `${SUMMARY_LEAD_MAP[reading_result.result]}，${fragments.join('、')}`
}
