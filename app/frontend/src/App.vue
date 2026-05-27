<script setup lang="ts">
/**
 * Application entry.
 *
 * onLaunch fires the two critical bootstrap loads and records the outcome
 * in the boot store; the route root (pages/index.vue) reads that
 * status to pick between the main surface and the fallback view. There is
 * no second uni-app route + reLaunch: the fallback is mutually exclusive
 * with the main surface (docs/glossary.md（路由）), and that exclusion
 * is a view-level switch.
 *
 * Critical resources:
 *   - tarotStore.loadCards() — fetches the 78-card metadata
 *   - themeStore.loadTheme() — fetches the current theme bundle
 *
 * Promise.allSettled lets us inspect each outcome independently: a reject
 * on either side, *or* a fulfilled call that leaves the corresponding
 * error ref populated (the stores write the error there on caught
 * failure), marks the boot failed. Until then `status` stays 'pending'
 * and the main surface renders idle (inert — no card/theme data is
 * consumed until the user starts a divination).
 */
import { onLaunch } from '@dcloudio/uni-app'
import { useTarotStore } from './core/store/tarot'
import { useThemeStore } from './core/store/theme'
import { useBootStatus } from './flows/base/composables/use_boot_status'

const tarotStore = useTarotStore()
const themeStore = useThemeStore()
const { markOk, markFailed } = useBootStatus()

onLaunch(() => {
  void bootstrap()
})

async function bootstrap(): Promise<void> {
  const [cardsResult, themeResult] = await Promise.allSettled([
    tarotStore.loadCards(),
    themeStore.loadTheme(),
  ])

  const cardsFailed = cardsResult.status === 'rejected'
    || tarotStore.cardsLoadError !== null
  const themeFailed = themeResult.status === 'rejected'
    || themeStore.loadError !== null

  if (cardsFailed || themeFailed) {
    markFailed()
    return
  }

  markOk()
}
</script>

<style>
/*
 * @import must precede all other CSS statements per the CSS spec, so
 * the global token / utility imports come first. The H5-only
 * @font-face declarations follow below.
 */
@import "./core/styles/global.css";
@import "./core/styles/overlay/_tokens.css";

/*
 * Font faces — H5 only.
 * ----------------------------------------------------------------
 * Declared here (in the App.vue SFC <style> block) instead of in
 * core/styles/global.css because uni-app's conditional compilation
 * directives (#ifdef H5 / #endif) reliably strip blocks only inside
 * SFC styles and .scss inputs. Plain .css files imported via @import
 * are processed by vite/postcss before the mp-weixin asset rewriter
 * gets a chance to honor the H5 guard, which then fails resolving
 * `/static/themes/...` (the rewriter prefixes it to `@/static/...`).
 *
 * The actual WOFF2 files live at `app/server/public/static/themes/...`
 * and are served by the backend at the origin-relative path; vite's
 * `publicDir` (set to `../server/public` in app/frontend/vite.config.ts) makes
 * them addressable as `/static/...` on H5 regardless of host.
 *
 * Mini-program font injection is handled separately by the theme
 * store (see stores/theme.ts) — the WeChat runtime does not honor
 * @font-face from regular stylesheets.
 */
/* #ifdef H5 */
@font-face {
  font-family: 'Cinzel';
  src: url('/static/themes/golden_dawn/fonts/cinzel-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Cinzel';
  src: url('/static/themes/golden_dawn/fonts/cinzel-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Cinzel';
  src: url('/static/themes/golden_dawn/fonts/cinzel-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'LXGW WenKai';
  src: url('/static/themes/golden_dawn/fonts/lxgw-wenkai-light.subset.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'LXGW WenKai';
  src: url('/static/themes/golden_dawn/fonts/lxgw-wenkai-regular.subset.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* #endif */
</style>
