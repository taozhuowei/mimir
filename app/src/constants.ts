/**
 * Global constants for static asset URLs used by animations.
 * Card data (including image URLs) now comes from GET /api/v1/cards.
 * Only the card back and suit icons are still needed here for DivinationOverlay.
 *
 * API base URL is defined in app/src/api/client.ts via VITE_API_BASE_URL.
 * Production mini program: configure VITE_API_BASE_URL in .env.production.
 */

// TODO Phase 3: derive from active theme via theme store
const STATIC_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
const THEME_BASE = `${STATIC_BASE}/static/themes/golden_dawn`

/** Card back image used during shuffle / cut / draw animations */
export const CARD_BACK_IMAGE = `${THEME_BASE}/tarot/card_back.jpeg`

/** Base URL for suit icons used in the progress header of DivinationOverlay */
export function getStaticIconBase(): string {
  return `${STATIC_BASE}/static/icons`
}
