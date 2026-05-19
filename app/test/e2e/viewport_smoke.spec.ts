import { test, expect } from '@playwright/test'

/**
 * Multi-viewport visual + contract smoke for the divination flow.
 *
 * Walks the home → divination → answer flow at every popular phone /
 * tablet / desktop viewport we want to defend against regression, and
 * captures `home-{tag}.png` + `result-{tag}.png` per device. Beyond the
 * screenshots, each pass asserts:
 *   • The result card never exceeds MAX_CARD_WIDTH (240) — the global
 *     "≤ largest phone" contract.
 *   • The answer surfaced: .answer-zone is visible, carries its quote
 *     (.ai-quote), and stays inside the viewport (no horizontal overflow,
 *     bottom not clipped).
 *
 * The old split-vs-drawer two-branch contract is gone: ReadingSplitView /
 * ReadingDrawerView were removed when the answer became a single inline
 * zone struck below the card on every width. There is no longer a
 * mode-specific layout to assert — only the unified answer surface — so
 * the per-mode branch was deleted rather than re-pointed at dead classes.
 *
 * Why still so many viewports: the layout has discrete spacing tiers and
 * the screenshot set is the regression net for the inline answer zone
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

// ----- Solver constant the card-size contract references ---------------
const MAX_CARD_WIDTH_PX = 240         // DEFAULT_MAX_CARD_WIDTH

for (const vp of VIEWPORTS) {
  test(`viewport smoke @ ${vp.tag}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })

    // ----- Home ----------------------------------------------------------
    // Selectors track the BEM class names introduced by B4 (IdleDeck split into
    // a composable) + B5 (HeaderArea unification):
    //   .title              → .title-content__title
    //   .idle-deck          → .idle-deck-content
    //   .phase-step-icon    → .progress-content__step-icon
    await page.goto('/')
    await expect(page.locator('.title-content__title')).toContainText('Scales Tarot', { timeout: 10_000 })
    await expect(page.locator('.idle-deck-content')).toBeVisible()

    // Too-small banner assertion intentionally dropped: TooSmallBanner.vue was
    // removed in commit 69afea2 ("chore(quality): clean up dead code so
    // pre-push gate passes"). Re-introduce only when a replacement viewport-
    // floor warning is actually wired in — see follow-up note below.

    await page.screenshot({
      path: `test-results/viewport-smoke/home-${vp.tag}.png`,
      fullPage: false,
    })

    // ----- Trigger divination -------------------------------------------
    await page.locator('.idle-deck-content').click()
    await expect(page.locator('.progress-content__step-icon').first()).toBeVisible({ timeout: 5_000 })

    // ----- Wait for the answer ------------------------------------------
    // 30 s budget covers entry + shuffle + cut + draw + reveal + the
    // server-side Answer round trip, the same envelope
    // divination_flow.spec.ts uses.
    await expect(page.locator('.answer-zone')).toBeAttached({ timeout: 30_000 })
    await expect(page.locator('.answer-zone .ai-quote')).toBeVisible({ timeout: 10_000 })
    // Buffer for the card lift + answer-zone fade + staged rise-in to settle.
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: `test-results/viewport-smoke/result-${vp.tag}.png`,
      fullPage: false,
    })

    // ----- Answer surface contract (unified, every viewport) ------------
    // No split / drawer branch anymore: one inline .answer-zone struck
    // below the card on all widths. Assert it surfaced with its quote and
    // is not clipped out of the viewport (no horizontal overflow; the
    // bottom-anchored edge stays on screen).
    const answerZone = page.locator('.answer-zone')
    await expect(answerZone).toBeVisible()
    await expect(answerZone.locator('.ai-quote')).toBeVisible()
    // The removed split / drawer / panel host must not resurrect.
    await expect(
      page.locator('.reading-split-view, .reading-drawer-view__sheet, .reading-panel'),
    ).toHaveCount(0)
    const zoneBox = await answerZone.boundingBox()
    expect(zoneBox).not.toBeNull()
    if (zoneBox) {
      expect(
        zoneBox.x,
        `answer zone must not overflow the left edge at ${vp.tag} (x=${zoneBox.x})`,
      ).toBeGreaterThanOrEqual(-1)
      expect(
        zoneBox.x + zoneBox.width,
        `answer zone must not overflow the right edge at ${vp.tag}`,
      ).toBeLessThanOrEqual(vp.width + 1)
      expect(
        zoneBox.y + zoneBox.height,
        `answer zone bottom must stay within the viewport at ${vp.tag}`,
      ).toBeLessThanOrEqual(vp.height + 1)
    }

    // ----- Card-size cap ------------------------------------------------
    // The first visible draw-wrapper is the result-stage card. Its width
    // must never exceed MAX_CARD_WIDTH_PX, regardless of how big the
    // actual viewport is — the whole point of the phone-shell cap.
    const visibleCard = page.locator('.draw-wrapper:visible').first()
    if (await visibleCard.count() > 0) {
      const cardBox = await visibleCard.boundingBox()
      if (cardBox) {
        expect(
          cardBox.width,
          `result card width must not exceed ${MAX_CARD_WIDTH_PX}px at ${vp.tag} (got ${cardBox.width})`,
        ).toBeLessThanOrEqual(MAX_CARD_WIDTH_PX + 1)
      }
    }
  })
}
