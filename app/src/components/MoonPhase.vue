<template>
  <!--
    Moon Phase Progress Indicator
    Renders a moon via data:image/svg+xml URI on <image> for cross-platform support.
    0 = New Moon (dark), 1 = Waxing Crescent, 2 = First Quarter, 3 = Full Moon + glow.
    Uses GSAP state-object pattern for animation (H5 + WeChat MP safe).
  -->
  <view class="moon-phase-container">
    <view class="moon-glow" :style="glowStyle" />
    <image class="moon-img" :src="moonSrc" mode="aspectFit" />
  </view>
</template>

<script setup lang="ts">
/**
 * MoonPhase component
 * Props: phase (0-3) controls illumination.
 * GSAP animates the shadow ellipse rx; each frame rebuilds the SVG data URI.
 * Glow breathing animation pulses on the current active phase.
 */
import { watch, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps<{ phase: number }>()

// Design tokens matching Golden Dawn card art
const MOON_GOLD = '#C8A850'
const MOON_DARK = '#1E0F06'

// Shadow ellipse rx values for each phase
// 44 = full cover (new moon), 28 = crescent, 0 = half moon, -44 = full moon
const PHASE_RX = [44, 28, 0, -44]

// GSAP state objects (plain JS, MP safe)
const _moon = { rx: 44 }
const _glow = { opacity: 0, scale: 1 }

// Reactive refs bound to template
const moonSrc = ref('')
const glowStyle = ref('opacity: 0; transform: scale(1)')

let breathTween: gsap.core.Tween | null = null

/** Build SVG data URI for current moon state (charset=utf-8 for MP compatibility) */
function buildMoonSvg(rx: number): string {
  const safe_rx = Math.max(0, rx)
  const shadow = rx > 0
    ? `<ellipse cx="50" cy="50" rx="${safe_rx}" ry="44" fill="${MOON_DARK}"/>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="${MOON_GOLD}" stroke-width="2" opacity="0.6"/><circle cx="50" cy="50" r="44" fill="${MOON_GOLD}"/>${shadow}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function refreshMoon() {
  moonSrc.value = buildMoonSvg(_moon.rx)
}

function refreshGlow() {
  glowStyle.value = `opacity: ${_glow.opacity}; transform: scale(${_glow.scale})`
}

function animateToPhase(target_phase: number) {
  const target_rx = PHASE_RX[target_phase] ?? 44

  gsap.to(_moon, {
    rx: target_rx,
    duration: 0.8,
    ease: 'power2.inOut',
    onUpdate: refreshMoon,
  })

  // Stop previous breathing
  if (breathTween) {
    breathTween.kill()
    breathTween = null
  }

  // Full moon gets a radiant glow; other phases get subtle breathing
  if (target_phase === 3) {
    gsap.to(_glow, {
      opacity: 0.7,
      scale: 1.6,
      duration: 1.0,
      ease: 'power2.out',
      onUpdate: refreshGlow,
      onComplete: () => {
        breathTween = gsap.to(_glow, {
          opacity: 0.4,
          scale: 1.4,
          duration: 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          onUpdate: refreshGlow,
        })
      },
    })
  } else {
    gsap.to(_glow, {
      opacity: 0.2,
      scale: 1.1,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: refreshGlow,
      onComplete: () => {
        breathTween = gsap.to(_glow, {
          opacity: 0.05,
          scale: 1.0,
          duration: 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          onUpdate: refreshGlow,
        })
      },
    })
  }
}

watch(() => props.phase, (val) => {
  animateToPhase(val)
})

onMounted(() => {
  _moon.rx = PHASE_RX[props.phase] ?? 44
  refreshMoon()
  animateToPhase(props.phase)
})

onUnmounted(() => {
  if (breathTween) breathTween.kill()
  gsap.killTweensOf([_moon, _glow])
})
</script>

<style scoped>
.moon-phase-container {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Radial glow behind the moon */
.moon-glow {
  position: absolute;
  width: 160%;
  height: 160%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 168, 80, 0.6) 0%, rgba(200, 168, 80, 0) 70%);
  pointer-events: none;
  will-change: transform, opacity;
}

.moon-img {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}
</style>
