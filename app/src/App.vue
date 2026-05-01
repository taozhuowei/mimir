<script setup lang="ts">
/**
 * Application entry — phase-2.1 skeleton.
 *
 * onLaunch dispatches between the main route and the fallback route based
 * on the success of two critical bootstrap resources:
 *   - tarotStore.loadCards() — fetches the 78-card metadata
 *   - themeStore.loadTheme() — fetches the current theme bundle
 *
 * Per PRD §2.2 #2 (and the architecture spec for phase-2.1), if either
 * resource fails the app reLaunches to the fallback route; otherwise it
 * stays on the default main route. The dispatcher uses Promise.allSettled
 * so a partial failure on either resource still gives both store actions a
 * chance to write their respective error refs before we redirect.
 */
import { onLaunch } from '@dcloudio/uni-app'
import { useTarotStore } from './stores/tarot'
import { useThemeStore } from './stores/theme'

const tarotStore = useTarotStore()
const themeStore = useThemeStore()

const FALLBACK_ROUTE = '/pages/fallback/index'

onLaunch(() => {
  void bootstrap()
})

async function bootstrap(): Promise<void> {
  // Fire both critical loads in parallel; allSettled lets us inspect each
  // outcome independently. A reject on either side, *or* a fulfilled call
  // that leaves the corresponding error ref populated (the stores write
  // the error there on caught failure), routes the user to the fallback.
  const [cardsResult, themeResult] = await Promise.allSettled([
    tarotStore.loadCards(),
    themeStore.loadTheme(),
  ])

  const cardsFailed = cardsResult.status === 'rejected'
    || tarotStore.cardsLoadError !== null
  const themeFailed = themeResult.status === 'rejected'
    || themeStore.loadError !== null

  if (cardsFailed || themeFailed) {
    uni.reLaunch({ url: FALLBACK_ROUTE })
  }
  // Otherwise stay on the default main route (pages/main/index).
}
</script>

<style>
@import "./styles/global.css";
@import "./styles/overlay/_tokens.css";
</style>
