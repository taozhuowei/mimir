/**
 * Name: use_css_var_bridge
 * Purpose: bind every derived `ResponsiveSizes` value as a CSS custom
 *          property on the calling SFC's root element so any descendant
 *          scoped CSS can reference them via `var(--margin)` /
 *          `var(--header-height)` etc. without re-subscribing to the
 *          composable. `useResponsiveScale` is a module-level singleton,
 *          so the SFC that owns the page root is the only place that
 *          needs to call this for the bridge to work — descendants stay
 *          declarative.
 * Reason: extracted from `MainSurface.vue` so the surface setup body
 *          stays focused on phase + controllers + view picker. The
 *          variable list is the single source of truth for the bridge.
 * Data flow: useResponsiveScale().sizes ──▶ computed object of CSS
 *          custom properties ──▶ `:style="cssVarStyle"` on the root view.
 */
import { computed, type ComputedRef } from 'vue'
import { useResponsiveScale } from './scale'
import { getMenuClearancePx } from './overlay_layout/wide_breakpoint_and_chrome'

export function useCssVarBridge(): ComputedRef<Record<string, string>> {
  const { sizes } = useResponsiveScale()
  // Resolve once at subscription time: the MP-WeChat capsule rect is
  // stable for the page lifetime and `getMenuClearancePx` returns 0 on
  // H5, so caching the px value avoids re-querying `uni.getMenuButton…`
  // on every reactive recompute. Surfaced as `--menu-clearance` so any
  // header / overlay can write `max(<baseline>, var(--menu-clearance, 0px))`
  // and stay correct on both platforms (task 8.2.5).
  const menuClearancePx = getMenuClearancePx()
  return computed(() => ({
    '--margin': `${sizes.value.margin}px`,
    '--gap': `${sizes.value.gap}px`,
    '--container-gap': `${sizes.value.containerGap}px`,
    '--header-height': `${sizes.value.headerHeight}px`,
    '--drawer-min-height': `${sizes.value.drawerMinHeight}px`,
    '--action-area-height': `${sizes.value.actionAreaHeight}px`,
    '--answer-zone-min-height': `${sizes.value.answerZoneMinHeight}px`,
    '--menu-clearance': `${menuClearancePx}px`,
    '--font-xxl': `${sizes.value.fontXXL}px`,
    '--font-xl': `${sizes.value.fontXL}px`,
    '--font-l': `${sizes.value.fontL}px`,
    '--font-m': `${sizes.value.fontM}px`,
    '--font-s': `${sizes.value.fontS}px`,
    '--font-xs': `${sizes.value.fontXS}px`,
    '--font-xxs': `${sizes.value.fontXXS}px`,
    /* 行高 token：无单位，跟随 font-size 自动联动，不缩放。 */
    '--leading-flat': '1',
    '--leading-tight': '1.26',
    '--leading-snug': '1.4',
    '--leading-normal': '1.6',
    '--leading-loose': '1.74',
    /* 字距 token：em 单位，相对当前 font-size 自动联动。 */
    '--tracking-tight': '0.01em',
    '--tracking-normal': '0.06em',
    '--tracking-wide': '0.1em',
    '--tracking-wider': '0.14em',
    '--tracking-widest': '0.25em',
  }))
}
