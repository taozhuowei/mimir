import { test, expect } from '@playwright/test'

/**
 * Happy path: home page → divination overlay → inline answer.
 *
 * The flow auto-progresses through shuffle/cut/draw/reveal once the user
 * taps the idle deck (per docs/state.md 占卜流程要求 "占卜流程应自动推进").
 * The 30-second timeout on the answer assertion covers the full
 * animation pipeline plus the server-side Answer lookup.
 *
 * Note: we deliberately do NOT click "回到首页" here. The answer is struck
 * inline below the card (.answer-card — no split / drawer / wrapper).
 * Verifying the answer surfaced with its quote and the back-home button
 * is in the DOM is enough to catch the regressions this test is designed
 * to prevent.
 */
test('home → divination → answer surfaces', async ({ page }) => {
  await page.goto('/')

  // Selectors track the post-T4 BEM class names aligned with PRD glossary:
  //   .title-content__title       — TitleContent root + title
  //   .deck                       — StageDeck wrapper (.deck--idle = idle gate)
  //   .fan-stack__hint-text       — idle touch-hint
  //   .progress-content__step-icon — divination phase progress icons
  //   .action-area                — terminal-flow action buttons container
  await expect(page.locator('.title-content__title')).toContainText('Scales Tarot')
  await expect(page.locator('.deck--idle')).toBeVisible()
  await expect(page.locator('.fan-stack__hint-text')).toBeVisible()

  await page.locator('.deck--idle').click()

  await expect(page.locator('.progress-content__step-icon').first()).toBeVisible({ timeout: 5_000 })
  expect(await page.locator('.progress-content__step-icon').count()).toBeGreaterThanOrEqual(4)

  await expect(page.locator('.answer-card')).toBeAttached({ timeout: 30_000 })
  await expect(page.locator('.answer-card .answer-card__quote')).toBeVisible({ timeout: 10_000 })

  // ActionArea mounts together with the answer card in the terminal
  // `answer` flow (no separate decision stage anymore).
  await expect(page.locator('.action-area')).toBeAttached()
  await expect(page.getByRole('button', { name: '回到首页' })).toBeAttached()
})
