/**
 * Name: core/viewport/viewport_metrics
 * Purpose: resolve raw viewport metrics across H5 and mini-program environments.
 * Reason: centralise platform-specific window info extraction into a single pure-ish helper.
 */

import type { ViewportMetrics } from './types'

/**
 * Returns the raw viewport dimensions and device pixel ratio.
 * This abstracts away the uni-app / browser API differences.
 */
export function resolveViewportMetrics(): ViewportMetrics {
  try {
    const info = uni.getSystemInfoSync()
    const screenHeight = info.screenHeight ?? info.windowHeight ?? 0
    const safeAreaBottomRaw = info.safeAreaInsets?.bottom ?? (info.safeArea ? screenHeight - info.safeArea.bottom : 0)
    const safeAreaTopRaw = info.safeAreaInsets?.top ?? info.safeArea?.top ?? 0

    return {
      width: info.windowWidth ?? info.screenWidth ?? 375,
      height: info.windowHeight ?? info.screenHeight ?? 812,
      safeAreaTop: safeAreaTopRaw,
      safeAreaBottom: safeAreaBottomRaw,
      dpr: info.pixelRatio ?? 1,
    }
  } catch {
    // #ifdef H5
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        safeAreaTop: 0,
        safeAreaBottom: 0,
        dpr: window.devicePixelRatio || 1,
      }
    }
    // #endif
    return { width: 375, height: 812, safeAreaTop: 0, safeAreaBottom: 0, dpr: 2 }
  }
}
