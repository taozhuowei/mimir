import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  getResultStatement,
  getSummaryText
} = require('../.test-dist/utils/result_panel.js')

function createReadingResult(result, meanings) {
  return {
    result,
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

assert.equal(getResultStatement('yes'), '塔罗牌根据您的问题呈现出积极的指示。')
assert.equal(getResultStatement('no'), '塔罗牌根据您的问题呈现出消极的指示。')
assert.equal(getResultStatement('uncertain'), '塔罗牌根据您的问题呈现出尚不明朗的指示。')

assert.equal(
  getSummaryText(yes_result),
  '当前牌面传递出积极信号，机会正在靠近，适合主动推进、局面稳定，可以继续投入'
)

assert.equal(
  getSummaryText(createReadingResult('uncertain', [])),
  '当前牌面信息仍不明朗'
)

console.log('result_panel.test.mjs passed')
