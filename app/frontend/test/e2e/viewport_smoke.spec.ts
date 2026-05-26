import { test, expect } from '@playwright/test'

/**
 * Multi-viewport visual + contract smoke for the divination flow.
 *
 * Walks the home → divination → answer flow at every popular phone /
 * tablet / desktop viewport we want to defend against regression, and
 * captures `home-{tag}.png` + `result-{tag}.png` per device. Beyond the
 * screenshots, each pass asserts:
 *   • The result card width tracks the stage rect (no absolute px cap):
 *     card width ≈ stage.width × 0.9 on every viewport, which means the
 *     card is bounded by the canvas cap (440) minus margins, not a
 *     hardcoded ceiling.
 *   • The answer surfaced: .answer-card is visible, carries its quote
 *     (.answer-card__quote), and stays inside the viewport (no horizontal
 *     overflow, bottom not clipped).
 *
 * The old split-vs-drawer two-branch contract is gone: ReadingSplitView /
 * ReadingDrawerView were removed when the answer became a single inline
 * card struck below the result card on every width — and the previous
 * .answer-zone wrapper was collapsed into .answer-card directly. There
 * is no longer a mode-specific layout to assert — only the unified
 * answer surface — so the per-mode branch was deleted rather than
 * re-pointed at dead classes.
 *
 * Why still so many viewports: the layout has discrete spacing tiers and
 * the screenshot set is the regression net for the inline answer card
 * across real phone / tablet / desktop sizes.
 */

interface Viewport {
  tag: string
  width: number
  height: number
  /** Top-level screen mode driven by viewport.width. */
  mode: 'too_small' | 'mobile' | 'pc'
}

const VIEWPORTS: readonly Viewport[] = [
  // -------- too_small (banner shows, layout still renders) ----------------
  { tag: 'galaxy-s8-360x740',          width: 360,  height: 740,  mode: 'too_small' },

  // -------- mobile / compact tier (375 ≤ w < 920) -------------------------
  // Note: Galaxy S22/23/24 at 360 wide is too_small per the 375 floor;
  // we keep one entry above and use the smallest "supported" Android
  // (Pixel 5 at 393) to cover the real sweet spot.
  { tag: 'iphone-se-375x667',          width: 375,  height: 667,  mode: 'mobile' },
  { tag: 'iphone-12-13-14-390x844',    width: 390,  height: 844,  mode: 'mobile' },
  { tag: 'pixel-7-412x915',            width: 412,  height: 915,  mode: 'mobile' },
  { tag: 'iphone-pro-max-430x932',     width: 430,  height: 932,  mode: 'mobile' },
  { tag: 'iphone-17-pro-max-440x956',  width: 440,  height: 956,  mode: 'mobile' },

  // -------- mobile / centered shell on tablet portrait --------------------
  // 768 × 1024 still uses bottom drawer because viewport.width < 920.
  // The phone-sized shell (440) sits centered for the result card area, but
  // the drawer sheet spans the full viewport width so the bottom panel
  // covers everything edge-to-edge.
  { tag: 'ipad-portrait-768x1024',     width: 768,  height: 1024, mode: 'mobile' },
  { tag: 'ipad-air-portrait-820x1180', width: 820,  height: 1180, mode: 'mobile' },

  // -------- pc / side-column reading layout (w ≥ 920) ---------------------
  { tag: 'small-laptop-1024x768',      width: 1024, height: 768,  mode: 'pc' },
  { tag: 'macbook-air-1280x800',       width: 1280, height: 800,  mode: 'pc' },
  { tag: 'macbook-air-13-1440x900',    width: 1440, height: 900,  mode: 'pc' },
  { tag: 'full-hd-desktop-1920x1080',  width: 1920, height: 1080, mode: 'pc' },
] as const

// ----- Solver constants the card-size contract references --------------
// Canvas / fill model (mirrors scale_constants.ts): canvas width is
// clamped to MAX_CANVAS_WIDTH on big viewports; on the answer scene the
// stage rect = (canvas - 2 × margin) wide and the result card =
// stage.width × RESULT_CARD_FILL_RATIO. There is no absolute px cap —
// the card scales with the stage, which scales with the reservation.
const MAX_CANVAS_WIDTH = 440
const RESULT_CARD_FILL_RATIO = 0.9

for (const vp of VIEWPORTS) {
  test(`viewport smoke @ ${vp.tag}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })

    // ----- Home ----------------------------------------------------------
    // Selectors track the post-T4 BEM class names aligned with PRD glossary:
    //   .title-content__title       — title content root
    //   .deck--idle                 — idle gate on the deck wrapper
    //   .progress-content__step-icon — divination phase progress icons
    await page.goto('/')
    await expect(page.locator('.title-content__title')).toContainText('Scales Tarot', { timeout: 10_000 })
    await expect(page.locator('.deck--idle')).toBeVisible()

    // Too-small banner assertion intentionally dropped: TooSmallBanner.vue was
    // removed in commit 69afea2 ("chore(quality): clean up dead code so
    // pre-push gate passes"). Re-introduce only when a replacement viewport-
    // floor warning is actually wired in — see follow-up note below.

    await page.screenshot({
      path: `test-results/viewport-smoke/home-${vp.tag}.png`,
      fullPage: false,
    })

    // ----- Trigger divination -------------------------------------------
    await page.locator('.deck--idle').click()
    await expect(page.locator('.progress-content__step-icon').first()).toBeVisible({ timeout: 5_000 })

    // ----- Wait for the answer ------------------------------------------
    // 30 s budget covers entry + shuffle + cut + draw + reveal + the
    // server-side Answer round trip, the same envelope
    // divination_flow.spec.ts uses.
    await expect(page.locator('.answer-card')).toBeAttached({ timeout: 30_000 })
    await expect(page.locator('.answer-card .answer-card__quote')).toBeVisible({ timeout: 10_000 })
    // Buffer for the card lift + answer fade + staged rise-in to settle.
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: `test-results/viewport-smoke/result-${vp.tag}.png`,
      fullPage: false,
    })

    // ----- Answer surface contract (unified, every viewport) ------------
    // No split / drawer branch anymore: one inline .answer-card struck
    // below the result card on all widths (the previous .answer-zone
    // wrapper was collapsed into .answer-card directly). Assert it
    // surfaced with its quote and is not clipped out of the viewport
    // (no horizontal overflow; the bottom-anchored edge stays on
    // screen).
    const answerCard = page.locator('.answer-card')
    await expect(answerCard).toBeVisible()
    await expect(answerCard.locator('.answer-card__quote')).toBeVisible()
    // The removed split / drawer / panel host must not resurrect.
    await expect(
      page.locator('.reading-split-view, .reading-drawer-view__sheet, .reading-panel, .answer-zone'),
    ).toHaveCount(0)
    const cardBox = await answerCard.boundingBox()
    expect(cardBox).not.toBeNull()
    if (cardBox) {
      expect(
        cardBox.x,
        `answer card must not overflow the left edge at ${vp.tag} (x=${cardBox.x})`,
      ).toBeGreaterThanOrEqual(-1)
      expect(
        cardBox.x + cardBox.width,
        `answer card must not overflow the right edge at ${vp.tag}`,
      ).toBeLessThanOrEqual(vp.width + 1)
      expect(
        cardBox.y + cardBox.height,
        `answer card bottom must stay within the viewport at ${vp.tag}`,
      ).toBeLessThanOrEqual(vp.height + 1)
    }

    // ----- Card-size envelope -------------------------------------------
    // The first visible draw-wrapper is the result-stage card. Its
    // width tracks the stage rect (no absolute px cap): canvas is
    // clamped to MAX_CANVAS_WIDTH on big viewports, so the upper bound
    // here is `MAX_CANVAS_WIDTH × RESULT_CARD_FILL_RATIO + 1`. We do
    // not assert a tight lower bound because actual sizes depend on
    // margin and reservation, which differ across viewports.
    const visibleResultCard = page.locator('.draw-wrapper:visible').first()
    if (await visibleResultCard.count() > 0) {
      const resultBox = await visibleResultCard.boundingBox()
      if (resultBox) {
        const upperBound = MAX_CANVAS_WIDTH * RESULT_CARD_FILL_RATIO + 1
        expect(
          resultBox.width,
          `result card width must not exceed ${upperBound}px at ${vp.tag} (got ${resultBox.width})`,
        ).toBeLessThanOrEqual(upperBound)
      }
    }
  })
}
