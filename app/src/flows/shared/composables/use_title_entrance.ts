/**
 * Name: flows/shared/composables/use_title_entrance
 * Purpose: owns TitleContent's idle staggered entrance — the three
 *          DOM-free animation state objects, their style refs, the GSAP
 *          timeline (with the reduced-motion shortcut), and the
 *          mount / variant-flip / unmount lifecycle — so the component
 *          stays a thin copy-renderer.
 * Reason: F4 of the parked-debt cleanup. TitleContent
 *          previously inlined the copy table, this ~60-line entrance
 *          animation, and the per-variant view split in one SFC. The
 *          animation is the part worth extracting; the copy table and
 *          the v-if variant branch are already a thin shell and stay in
 *          the component. Pure move — durations (0.6s), eases
 *          (power3.out), the 0.08 / 0.16 stagger, the reduced-motion
 *          immediate-final-state branch, the reset-every-run behaviour
 *          and the kill-on-unmount are byte-for-byte the component's
 *          previous logic.
 * Data flow: caller passes the `variant` ref. The idle variant runs the
 *          timeline on mount and re-runs on a runtime variant flip
 *          (e.g. fallback → idle on retry); non-idle variants no-op.
 *          Returns the three style refs the template binds.
 */
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../../../core/utils/accessibility'

export function useTitleEntrance(variant: Ref<'idle' | 'fallback'>) {
  /* ── DOM-free animation state (MP-WeChat compatible) ──────────────── */

  const titleStyle = ref<Record<string, string>>({})
  const subtitleStyle = ref<Record<string, string>>({})
  const guidanceStyle = ref<Record<string, string>>({})

  const _title = { y: 20, opacity: 0 }
  const _subtitle = { y: 20, opacity: 0 }
  const _guidance = { y: 20, opacity: 0 }

  function flushHeaderStyles() {
    titleStyle.value = {
      transform: `translateY(${_title.y}px)`,
      opacity: String(_title.opacity),
    }
    subtitleStyle.value = {
      transform: `translateY(${_subtitle.y}px)`,
      opacity: String(_subtitle.opacity),
    }
    guidanceStyle.value = {
      transform: `translateY(${_guidance.y}px)`,
      opacity: String(_guidance.opacity),
    }
  }

  function runEntranceAnimation() {
    if (variant.value !== 'idle') return

    // Reset DOM-free state every run so re-mount or variant flip starts fresh.
    _title.y = 20; _title.opacity = 0
    _subtitle.y = 20; _subtitle.opacity = 0
    _guidance.y = 20; _guidance.opacity = 0
    flushHeaderStyles()

    if (prefersReducedMotion()) {
      _title.y = 0; _title.opacity = 1
      _subtitle.y = 0; _subtitle.opacity = 1
      _guidance.y = 0; _guidance.opacity = 1
      flushHeaderStyles()
      return
    }

    const tl = gsap.timeline()
    tl.to(_title, {
      y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', onUpdate: flushHeaderStyles,
    })
      .to(_subtitle, {
        y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', onUpdate: flushHeaderStyles,
      }, 0.08)
      .to(_guidance, {
        y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', onUpdate: flushHeaderStyles,
      }, 0.16)
  }

  onMounted(() => {
    runEntranceAnimation()
  })

  // If the parent flips variant at runtime (e.g. fallback → idle on retry),
  // re-run the entrance so the user sees a fresh fade-in instead of the
  // stale opacity-0 state from the previous variant.
  watch(variant, () => { runEntranceAnimation() })

  onUnmounted(() => {
    gsap.killTweensOf(_title)
    gsap.killTweensOf(_subtitle)
    gsap.killTweensOf(_guidance)
  })

  return { titleStyle, subtitleStyle, guidanceStyle }
}
