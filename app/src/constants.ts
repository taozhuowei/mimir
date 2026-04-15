/**
 * Fallback constants for static asset URLs.
 *
 * API base URL is defined in app/src/api/client.ts via VITE_API_BASE_URL.
 * Production mini program: configure VITE_API_BASE_URL in .env.production.
 *
 * The card-back and settings icon are bundled into the package so they always
 * render — even on a real device that cannot reach the dev server. Themed
 * overrides from the theme store still take precedence when available.
 */

/** Bundled card back image — always loads regardless of network state. */
export const CARD_BACK_IMAGE = '/static/card_back.jpeg'

/** Bundled settings icon — always loads regardless of network state. */
export const SETTINGS_ICON_URL = '/static/icon-settings.svg'
