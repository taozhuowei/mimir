import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base_url = process.env.TEST_BASE_URL

if (!base_url) {
  throw new Error('TEST_BASE_URL is required')
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

  await page.locator('.start-area').click({ force: true })
  await page.waitForSelector('.btn-primary')

  await page.locator('.btn-primary').click({ force: true })
  await page.waitForFunction(() => document.body.innerText.includes('请切牌'), null, { timeout: 10000 })

  await page.locator('.btn-primary').click({ force: true })
  await page.waitForFunction(() => document.body.innerText.includes('抽取牌阵'), null, { timeout: 10000 })

  await page.locator('.btn-primary').click({ force: true })
  await page.waitForSelector('[data-testid="result-statement"]', { timeout: 20000 })

  assert.equal(await page.locator('[data-testid="result-card-item"]').count(), 3)
  assert.ok(await page.locator('[data-testid="restart-button"]').isVisible())

  await page.locator('[data-testid="restart-button"]').click({ force: true })
  await page.waitForSelector('.start-area', { timeout: 10000 })
} finally {
  await browser.close()
}

console.log('divination_flow.e2e.mjs passed')
