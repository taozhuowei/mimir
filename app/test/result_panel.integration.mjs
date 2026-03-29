import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base_url = process.env.TEST_BASE_URL

if (!base_url) {
  throw new Error('TEST_BASE_URL is required')
}

const mocked_result = {
  result: 'yes',
  confidence: 67,
  cardDetails: [
    {
      card: {
        id: 'major_arcana_19_the_sun',
        name: '太阳',
        nameEn: 'The Sun',
        number: 19,
        type: 'major',
        image: '/static/themes/golden_dawn/tarot/major/major_arcana_19_the_sun.jpeg',
        upright: {
          keywords: [],
          meaning: '成功，明朗，希望，行动正在得到照亮',
          sentiment: 'positive'
        },
        reversed: {
          keywords: [],
          meaning: '迟疑，能量消耗，对结果缺乏把握',
          sentiment: 'negative'
        }
      },
      position: 'upright',
      meaning: '成功，明朗，希望，行动正在得到照亮'
    },
    {
      card: {
        id: 'major_arcana_01_the_magician',
        name: '魔术师',
        nameEn: 'The Magician',
        number: 1,
        type: 'major',
        image: '/static/themes/golden_dawn/tarot/major/major_arcana_01_the_magician.jpeg',
        upright: {
          keywords: [],
          meaning: '掌控，执行，资源已经到位',
          sentiment: 'positive'
        },
        reversed: {
          keywords: [],
          meaning: '分心，技巧失衡，节奏被打断',
          sentiment: 'negative'
        }
      },
      position: 'upright',
      meaning: '掌控，执行，资源已经到位'
    },
    {
      card: {
        id: 'major_arcana_17_the_star',
        name: '星星',
        nameEn: 'The Star',
        number: 17,
        type: 'major',
        image: '/static/themes/golden_dawn/tarot/major/major_arcana_17_the_star.jpeg',
        upright: {
          keywords: [],
          meaning: '信心，疗愈，未来值得期待',
          sentiment: 'positive'
        },
        reversed: {
          keywords: [],
          meaning: '迟滞，怀疑，愿景尚未落地',
          sentiment: 'negative'
        }
      },
      position: 'upright',
      meaning: '信心，疗愈，未来值得期待'
    }
  ]
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: {
    width: 1440,
    height: 1200
  }
})

try {
  await page.goto(base_url)

  await page.evaluate((payload) => {
    window.__TAROT_TEST_API__.showResult({
      question: '这次推进是否可行？',
      readingResult: payload
    })
  }, mocked_result)

  await page.waitForSelector('[data-testid="result-answer"]')

  const answer_text = await page.locator('[data-testid="result-answer"]').textContent()
  const headline_text = await page.locator('[data-testid="result-headline"]').textContent()
  const card_count = await page.locator('[data-testid="result-card-item"]').count()

  assert.equal(answer_text, '是')
  assert.notEqual(headline_text, answer_text)
  assert.equal(card_count, 3)

  const card_boxes = await page.locator('[data-testid="result-card-visual"]').evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      return {
        width: box.width,
        height: box.height,
        top: box.top
      }
    })
  )

  assert.equal(card_boxes.length, 3)

  for (const box of card_boxes) {
    assert.ok(box.width >= 120, `expected card width >= 120, received ${box.width}`)
    assert.ok(box.height / box.width > 1.45, `expected card ratio > 1.45, received ${box.height / box.width}`)
  }

  const top_offsets = card_boxes.map((box) => box.top)
  const max_top = Math.max(...top_offsets)
  const min_top = Math.min(...top_offsets)

  assert.ok(max_top - min_top < 24, `expected matrix cards to align on one row, delta was ${max_top - min_top}`)
} finally {
  await browser.close()
}

console.log('result_panel.integration.mjs passed')
