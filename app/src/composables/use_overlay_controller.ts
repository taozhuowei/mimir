/**
 * Name: use_overlay_controller
 * Purpose: backward-compatibility re-export shim for use_overlay.
 * Reason: renamed to use_overlay; this shim keeps existing imports working.
 * Data flow: delegates entirely to use_overlay.
 */

export { useOverlay as useOverlayController } from './use_overlay'
export type { UseOverlayDeps as UseOverlayControllerDeps } from './use_overlay'
