/**
 * Fallback constants for static asset URLs.
 *
 * API base URL is defined in app/src/api/client.ts via VITE_API_BASE_URL.
 * Production mini program: configure VITE_API_BASE_URL in .env.production.
 *
 * Fallback values used before theme loads. Theme store overrides these.
 */

import { API_BASE } from './api/client'
const THEME_BASE = `${API_BASE}/static/themes/golden_dawn`

/** Fallback card back image used during shuffle / cut / draw animations */
export const CARD_BACK_IMAGE = `${THEME_BASE}/tarot/card_back.jpeg`

/** Settings icon URL - network path for mini program compatibility */
export const SETTINGS_ICON_URL = `${THEME_BASE}/ui/icon-settings.svg`
