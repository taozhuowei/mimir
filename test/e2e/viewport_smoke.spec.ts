import { test, expect } from '@playwright/test'

/**
 * Multi-viewport visual + contract smoke for the divination flow.
 *
 * Walks the home → divination → reading flow at every popular phone /
 * tablet / desktop viewport we want to defend against regression, and
 * captures `home-{tag}.png` + `result-{tag}.png` per device. Beyond the
 * screenshots, each pass asserts:
 *   • The result card never exceeds MAX_CARD_WIDTH (240) — the global
 *     "≤ largest phone" contract.
 *   • Mobile-mode drawer sits inside the centered phone-shell width
 *     (≤ MAX_STAGE_VIEWPORT_WIDTH = 440).
 *   • PC-mode (≥ 920) renders the side-column reading sidebar instead
 *     of the bottom drawer.
 *   • The "too small" banner shows iff the actual viewport width is
 *     below MIN_VIEWPORT_WIDTH (375).
 *
 * Why so many viewports: the layout has three discrete spacing tiers
 * (compact / regular / wide) and three top-level screen modes
 * (too_small / mobile / pc). Each combination needs a representative
 * real device or we rely on the math being right by inspection.
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
  // The phone-sized shell (440) sits centered with background filling the
  // ~328 px on each side.
  { tag: 'ipad-portrait-768x1024',     width: 768,  height: 1024, mode: 'mobile' },
  { tag: 'ipad-air-portrait-820x1180', width: 820,  height: 1180, mode: 'mobile' },

  // -------- pc / side-column reading layout (w ≥ 920) ---------------------
  { tag: 'small-laptop-1024x768',      width: 1024, height: 768,  mode: 'pc' },
  { tag: 'macbook-air-1280x800',       width: 1280, height: 800,  mode: 'pc' },
  { tag: 'macbook-air-13-1440x900',    width: 1440, height: 900,  mode: 'pc' },
  { tag: 'full-hd-desktop-1920x1080',  width: 1920, height: 1080, mode: 'pc' },
] as const

// ----- Solver constants the contract assertions reference --------------
const MAX_STAGE_WIDTH_PX = 440        // MAX_STAGE_VIEWPORT_WIDTH
const DRAWER_WIDE_WIDTH_PX = 480      // DEFAULT_DRAWER_WIDE_WIDTH
const DRAWER_MIN_INITIAL_HEIGHT_PX = 220
const MAX_CARD_WIDTH_PX = 240         // DEFAULT_MAX_CARD_WIDTH

for (const vp of VIEWPORTS) {
  test(`viewport smoke @ ${vp.tag}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })

    // ----- Home ----------------------------------------------------------
    await page.goto('/')
    await expect(page.locator('.title')).toContainText('Scales Tarot', { timeout: 10_000 })
    await expect(page.locator('.idle-deck')).toBeVisible()

    // Too-small banner: visible iff viewport.width < 375.
    const banner = page.locator('.too-small-banner')
    if (vp.mode === 'too_small') {
      await expect(banner).toBeVisible()
    } else {
      await expect(banner).toHaveCount(0)
    }

    await page.screenshot({
      path: `test-results/viewport-smoke/home-${vp.tag}.png`,
      fullPage: false,
    })

    // ----- Trigger divination -------------------------------------------
    await page.locator('.idle-deck').click()
    await expect(page.locator('.phase-step-icon').first()).toBeVisible({ timeout: 5_000 })

    // ----- Wait for the reading panel -----------------------------------
    // 30 s budget covers entry + shuffle + cut + draw + reveal + the
    // rule-based reading round trip, the same envelope
    // divination_flow.spec.ts uses.
    await expect(page.locator('.reading-panel')).toBeAttached({ timeout: 30_000 })
    await expect(page.locator('.reading-panel .hero-title')).toBeVisible({ timeout: 10_000 })
    // Buffer for the lift transform + drawer/sidebar slide-in to settle.
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: `test-results/viewport-smoke/result-${vp.tag}.png`,
      fullPage: false,
    })

    // ----- Mode-specific contract ---------------------------------------
    if (vp.mode === 'pc') {
      // PC mode: ResultSidebar mounts (480 px right column), no
      // drawer-sheet bottom panel. The side column lives inside the
      // centered overlay-main shell (max-width 920).
      const sidebar = page.locator('.sidebar-container')
      await expect(sidebar).toBeVisible()
      const sidebarBox = await sidebar.boundingBox()
      expect(sidebarBox).not.toBeNull()
      if (sidebarBox) {
        expect(sidebarBox.width).toBeCloseTo(DRAWER_WIDE_WIDTH_PX, 0)
      }
      // Drawer (mobile component) must NOT mount in pc mode.
      await expect(page.locator('.drawer-sheet')).toHaveCount(0)
    } else {
      // Mobile / too_small: ResultDrawer mounts. The drawer sits inside
      // the centered overlay-main shell, capped at MAX_STAGE_WIDTH_PX.
      const drawerSheet = page.locator('.drawer-sheet')
      await expect(drawerSheet).toBeVisible()
      const sheetBox = await drawerSheet.boundingBox()
      expect(sheetBox).not.toBeNull()
      if (sheetBox) {
        expect(
          sheetBox.height,
          `narrow drawer initialHeight must be >= ${DRAWER_MIN_INITIAL_HEIGHT_PX}px at ${vp.tag}`,
        ).toBeGreaterThanOrEqual(DRAWER_MIN_INITIAL_HEIGHT_PX)
        expect(
          sheetBox.width,
          `drawer width must be ≤ phone-shell cap (${MAX_STAGE_WIDTH_PX}) at ${vp.tag}`,
        ).toBeLessThanOrEqual(MAX_STAGE_WIDTH_PX + 1)
      }
      // Sidebar (pc component) must NOT mount in mobile mode.
      await expect(page.locator('.sidebar-container')).toHaveCount(0)
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
