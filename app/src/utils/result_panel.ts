/**
 * ResultPanel helpers
 * 负责结果页文案映射与摘要生成，便于单元测试和页面复用。
 */

import type { ReadingResult } from './tarotReading'

const ANSWER_TEXT_MAP: Record<ReadingResult['result'], string> = {
  yes: '是',
  no: '否',
  uncertain: '未定'
}

const HEADLINE_TEXT_MAP: Record<ReadingResult['result'], string> = {
  yes: '牌面倾向肯定',
  no: '牌面倾向否定',
  uncertain: '牌面仍待观察'
}

const SUMMARY_LEAD_MAP: Record<ReadingResult['result'], string> = {
  yes: '牌面偏向推进',
  no: '牌面偏向收缩',
  uncertain: '牌面仍在摇摆'
}

export function getAnswerText(result: ReadingResult['result']): string {
  return ANSWER_TEXT_MAP[result]
}

export function getHeadlineText(result: ReadingResult['result']): string {
  return HEADLINE_TEXT_MAP[result]
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
