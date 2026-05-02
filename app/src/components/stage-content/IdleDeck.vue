<template>
  <!--
    IdleDeck — phase-2.2.a migration target.
    Stage-content for the idle stage; renders the looping fan-out / fan-in
    animation described in PRD §7.5.1 ("fan animation"). The 12-card stack
    is sized by the layout solver (matching the divination draw card so the
    visual continuity from idle → divination feels stable). Tapping the
    deck region emits `triggerDivination` and runs the legacy "scene push
    + fade" exit animation.
  -->
  <view
    class="idle-deck-content"
    role="button"
    tabindex="0"
    aria-label="开始占卜"
    :style="sceneStyle"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <view class="idle-deck-content__deck" :style="deckContainerStyle">
      <image
        v-for="i in DECK_SIZE"
        :key="i"
        class="idle-deck-content__card"
        :src="cardBack"
        :style="cardsStyle[i - 1]"
        role="img"
        aria-label="塔罗牌背面"
        lazy-load
      />
    </view>

    <view class="idle-deck-content__hint" :style="{ opacity: hintOpacity }">
      <view class="idle-deck-content__hint-line" />
      <text class="idle-deck-content__hint-text font-display">TOUCH TO DIVINE</text>
      <view class="idle-deck-content__hint-line" />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Name: IdleDeck (stage content)
 * Purpose: stage-content for the idle stage; renders the looping fan
 *          animation that invites the user to tap the deck (PRD §7.5.1).
 *          Owns the 12-card GSAP timeline, the card-size derivation, and
 *          the click-triggered exit animation. Emits `triggerDivination`
 *          *immediately* on tap so the parent view + main page can promote
 *          the application phase without waiting for the exit animation.
 * Reason: separating stage content from the Stage container lets us swap
 *         scenes without touching layout. Animation logic stays self-
 *         contained inside this component, matching the layered model
 *         (views own layout, containers own slots, stage-content owns
 *         animation).
 * Data flow: theme store provides the card-back image; layout solver
 *           provides the card width/height. The click handler emits
 *           `triggerDivination` to the parent IdleView.
 *
 * Migrated from: pages/index/index.vue (handleDeckClick, startDeckAnimation,
 *                cardsStyle / cardWidth / cardHeight, scene exit tween).
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useThemeStore } from '../../stores/theme'
import { useTarotStore } from '../../stores/tarot'
import { prefersReducedMotion } from '../../utils/accessibility'
import { DECK_CLICK_SAFETY_MS } from '../../core/config/layout_constants'
import { solveLayout } from '../../core/sizing/layout_solver'
import {
  deriveSizes,
  pickCanvasWidth,
  readViewport,
} from '../../core/sizing/scale'
import { buildFanTimeline } from '../../animation/phases/fan/builder'

const emit = defineEmits<{
  (event: 'triggerDivination'): void
}>()

const themeStore = useThemeStore()
const tarotStore = useTarotStore()

/** Number of cards stacked in the idle deck (PRD §7.5.1 fan animation). */
const DECK_SIZE = 12
const DECK_CLICK_RELEASE_MS = 300

/* ── Resolved card size from the layout solver ────────────────────── */

const cardWidth = ref(100)
const cardHeight = ref(160)
let winHeight = 667

const deckContainerStyle = computed(() => ({
  width: `${cardWidth.value}px`,
  height: `${cardHeight.value}px`,
}))

const cardBack = computed(() => themeStore.cardBackImage)

function resolveCardSize() {
  try {
    const winInfo = uni.getWindowInfo()
    winHeight = winInfo.windowHeight

    // Use the same solver as the divination draw stage so the card size
    // stays stable across the idle → divination transition.
    const rawViewport = readViewport({
      windowWidth: winInfo.windowWidth,
      windowHeight: winInfo.windowHeight,
      safeAreaInsets: winInfo.safeAreaInsets,
    })
    const viewport = { ...rawViewport, width: pickCanvasWidth(rawViewport.width) }
    const layout = solveLayout({
      viewport,
      sizes: deriveSizes(viewport.width),
      scene: 'draw_stage',
    })

    cardWidth.value = layout.drawCardWidth
    cardHeight.value = layout.drawCardHeight
  } catch {
    // Keep the defaults on failure — the static stack still renders.
  }
}

/* ── DOM-free animation state ─────────────────────────────────────── */

const cardsStyle = ref<Record<string, string>[]>(Array(DECK_SIZE).fill({}))
const _cards = Array(DECK_SIZE)
  .fill(0)
  .map(() => ({ x: 0, y: 0, rotation: 0, scale: 1 }))
let _cardsAnimating = false
let idleTimeline: gsap.core.Timeline | null = null

const sceneStyle = ref<Record<string, string>>({})
const hintOpacity = ref(0)
const _scene = { scale: 1, y: 0, opacity: 1 }
const _hint = { opacity: 0 }

const isStartingDivination = ref(false)

function flushCardsStyle() {
  cardsStyle.value = _cards.map((c) => ({
    transform: `translate3d(${c.x}px, ${c.y}px, 0) rotate(${c.rotation}deg) scale(${c.scale})`,
    willChange: _cardsAnimating ? 'transform' : 'auto',
  }))
}

function startFanLoop() {
  if (idleTimeline) idleTimeline.kill()

  // Reset every card to the centred stack before the loop kicks off.
  _cards.forEach((c) => { c.x = 0; c.y = 0; c.rotation = 0; c.scale = 1 })
  flushCardsStyle()

  _cardsAnimating = !prefersReducedMotion()
  idleTimeline = buildFanTimeline({ targets: _cards, onUpdate: flushCardsStyle })
}

function runEntranceHint() {
  // Touch hint fade — runs once per mount, slightly after the deck appears
  // so it doesn't compete with the title entrance for attention.
  _hint.opacity = 0
  if (prefersReducedMotion()) {
    hintOpacity.value = 0.6
    return
  }
  gsap.to(_hint, {
    opacity: 0.6,
    duration: 0.8,
    delay: 0.6,
    onUpdate: () => {
      hintOpacity.value = _hint.opacity
    },
  })
}

/* ── Click → trigger divination ───────────────────────────────────── */

function handleClick() {
  // Reactive lock + safety timer prevent double-trigger during transition.
  if (isStartingDivination.value || tarotStore.isAnimating) return
  isStartingDivination.value = true

  const safetyTimer = setTimeout(() => {
    isStartingDivination.value = false
  }, DECK_CLICK_SAFETY_MS)

  const releaseLock = () => {
    clearTimeout(safetyTimer)
    setTimeout(() => {
      isStartingDivination.value = false
    }, DECK_CLICK_RELEASE_MS)
  }

  // Emit immediately — the page promotes the phase right away so the
  // divination view starts mounting in parallel with the exit animation.
  emit('triggerDivination')

  if (idleTimeline) {
    idleTimeline.kill()
    idleTimeline = null
  }
  _cardsAnimating = false
  flushCardsStyle()

  if (prefersReducedMotion()) {
    sceneStyle.value = { opacity: '0' }
    releaseLock()
    return
  }

  // Snap cards back to centre, then push the whole scene down + fade.
  gsap.to(_cards, {
    duration: 0.3,
    ease: 'power2.out',
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    onUpdate: flushCardsStyle,
    onComplete: () => {
      _scene.scale = 1
      _scene.y = 0
      _scene.opacity = 1
      gsap.to(_scene, {
        scale: 1.5,
        y: winHeight * 0.2,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.in',
        onUpdate: () => {
          sceneStyle.value = {
            transform: `scale(${_scene.scale}) translateY(${_scene.y}px)`,
            opacity: String(_scene.opacity),
            willChange: 'transform, opacity',
          }
        },
        onComplete: () => {
          sceneStyle.value = { ...sceneStyle.value, willChange: 'auto' }
          releaseLock()
        },
      })
    },
  })
}

/* ── Lifecycle ────────────────────────────────────────────────────── */

function handleResize() {
  resolveCardSize()
}

onMounted(() => {
  resolveCardSize()
  uni.onWindowResize(handleResize)
  // Defer the entrance + loop start by one frame so the parent view
  // finishes layout before GSAP touches the state objects.
  startFanLoop()
  runEntranceHint()
})

onUnmounted(() => {
  uni.offWindowResize(handleResize)
  if (idleTimeline) {
    idleTimeline.kill()
    idleTimeline = null
  }
  _cardsAnimating = false
  gsap.killTweensOf(_cards)
  gsap.killTweensOf(_scene)
  gsap.killTweensOf(_hint)
})
</script>

<style scoped>
.idle-deck-content {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transform-origin: center center;
}

.idle-deck-content__deck {
  position: relative;
  z-index: 10;
}

.idle-deck-content__card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  border: 1px solid var(--color-border);
  box-shadow: 0 2rpx 8rpx rgba(30, 15, 6, 0.3);
}

/* Deepest shadow on the bottom card — H5 only because mini-program parser
   doesn't reliably support `:first-child` on uni-app `<image>` tags. */
/* #ifdef H5 */
.idle-deck-content__card:first-child {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
/* #endif */

.idle-deck-content__hint {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 80rpx);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  pointer-events: none;
}

.idle-deck-content__hint-line {
  width: 50rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, var(--color-border-strong), transparent);
}

.idle-deck-content__hint-text {
  font-size: 20rpx;
  color: var(--color-text-muted);
  letter-spacing: 0.25em;
}

@media (prefers-reduced-motion: reduce) {
  .idle-deck-content__card,
  .idle-deck-content__hint {
    transition: none !important;
    animation: none !important;
  }
}
</style>
