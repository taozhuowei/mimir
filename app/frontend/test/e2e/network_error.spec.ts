import { test, expect } from '@playwright/test'

/**
 * Verifies the network-failure recovery path: when the divination API
 * returns a 5xx error, the inline answer card renders an error state
 * with a retry affordance (instead of leaving the user stuck on the
 * reveal animation). The split / drawer overlay was removed — the error
 * line lives on `.answer-card` directly (no wrapper).
 *
 * Replaces the old shell script that mutated the backend source file in
 * place. page.route() is the right tool here: it intercepts the request
 * without touching server code or rebuilding.
 */
test('reading API failure surfaces a retryable error UI', async ({ page }) => {
  // Intercept BEFORE navigating so the very first reading request fails.
  await page.route('**/api/v1/divinations', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'simulated server error' }),
    })
  })

  await page.goto('/')
  await page.locator('.deck--idle').click()

  // The error state is struck inline under the card
  // (AnswerCard's .answer-card__error-text), with the retry button in
  // the colocated ActionArea. Either the error line or the explicit
  // retry button is sufficient evidence that the failure path was taken.
  const errorIndicator = page
    .locator('.answer-card__error-text')
    .or(page.getByRole('button', { name: '重试读取' }))
    .or(page.getByText('重试读取'))

  await expect(errorIndicator.first()).toBeAttached({ timeout: 30_000 })
})
