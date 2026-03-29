import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  getAnswerText,
  getHeadlineText,
  getSummaryText
} = require('../.test-dist/utils/result_panel.js')

function createReadingResult(result, meanings) {
  return {
    result,
    confidence: 67,
    cardDetails: meanings.map((meaning, index) => ({
      card: {
        id: `card-${index}`,
        name: `Card ${index + 1}`,
        nameEn: `Card ${index + 1}`,
        number: index + 1,
        type: 'major',
        image: `/static/card-${index + 1}.jpeg`,
        upright: {
          keywords: [],
          meaning,
          sentiment: 'positive'
        },
        reversed: {
          keywords: [],
          meaning: `${meaning} reversed`,
          sentiment: 'negative'
        }
      },
      position: 'upright',
      meaning
    }))
  }
}

const yes_result = createReadingResult('yes', [
  '机会正在靠近，适合主动推进。',
  '局面稳定，可以继续投入。'
])

assert.equal(getAnswerText('yes'), '是')
assert.equal(getAnswerText('no'), '否')
assert.equal(getAnswerText('uncertain'), '未定')

assert.equal(getHeadlineText('yes'), '牌面倾向肯定')
assert.equal(getHeadlineText('no'), '牌面倾向否定')
assert.equal(getHeadlineText('uncertain'), '牌面仍待观察')

assert.equal(
  getSummaryText(yes_result),
  '牌面偏向推进，机会正在靠近，适合主动推进、局面稳定，可以继续投入'
)

assert.equal(
  getSummaryText(createReadingResult('uncertain', [])),
  '牌面仍在摇摆'
)

console.log('result_panel.test.mjs passed')
