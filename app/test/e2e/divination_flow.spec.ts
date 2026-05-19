import { test, expect } from '@playwright/test'

/**
 * Happy path: home page → divination overlay → inline answer.
 *
 * The flow auto-progresses through shuffle/cut/draw/reveal once the user
 * taps the idle deck (per docs/prd/state.md（占卜流程要求） "占卜流程应自动推进"). The 30-second
 * timeout on the answer-zone assertion covers the full animation
 * pipeline plus the server-side Answer lookup.
 *
 * Note: we deliberately do NOT click "回到首页" here. The answer is struck
 * inline below the card (.answer-zone — the split / drawer overlay was
 * removed). Verifying the answer surfaced with its quote and the
 * back-home button is in the DOM is enough to catch the regressions this
 * test is designed to prevent.
 */
test('home → divination → answer surfaces', async ({ page }) => {
  await page.goto('/')

  // Selectors track the BEM class names introduced by the B4 (IdleDeck split into
  // a composable) + B5 (HeaderArea unification) refactors:
  //   .title              → .title-content__title
  //   .idle-deck          → .idle-deck-content
  //   .touch-hint         → .idle-deck-content__hint-text
  //   .phase-step-icon    → .progress-content__step-icon
  //   .action-bar         → .action-area (renamed when ActionBar was migrated to ActionArea)
  await expect(page.locator('.title-content__title')).toContainText('Scales Tarot')
  await expect(page.locator('.idle-deck-content')).toBeVisible()
  await expect(page.locator('.idle-deck-content__hint-text')).toBeVisible()

  await page.locator('.idle-deck-content').click()

  await expect(page.locator('.progress-content__step-icon').first()).toBeVisible({ timeout: 5_000 })
  expect(await page.locator('.progress-content__step-icon').count()).toBeGreaterThanOrEqual(4)

  await expect(page.locator('.answer-zone')).toBeAttached({ timeout: 30_000 })
  await expect(page.locator('.answer-zone .ai-quote')).toBeVisible({ timeout: 10_000 })

  // The action area should be present in the DOM with the back-home affordance,
  // even if collapsed inside the drawer at default height.
  await expect(page.locator('.action-area')).toBeAttached()
  await expect(page.getByRole('button', { name: '回到首页' })).toBeAttached()
})
