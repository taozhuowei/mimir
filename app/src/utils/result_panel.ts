/**
 * ResultPanel helpers
 * 负责结果页文案映射与摘要生成，便于单元测试和页面复用。
 */

import type { ReadingResult } from './tarotReading'

const RESULT_INDICATION_MAP: Record<ReadingResult['result'], string> = {
  yes: '积极',
  no: '消极',
  uncertain: '尚不明朗'
}

const SUMMARY_LEAD_MAP: Record<ReadingResult['result'], string> = {
  yes: '当前牌面传递出积极信号',
  no: '当前牌面传递出谨慎信号',
  uncertain: '当前牌面信息仍不明朗'
}

export function getResultStatement(result: ReadingResult['result']): string {
  return `塔罗牌根据您的问题呈现出${RESULT_INDICATION_MAP[result]}的指示。`
}

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
