<template>
  <text class="typewriter-text">{{ displayed_text }}</text>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  startDelay?: number
  charInterval?: number
  instant?: boolean
}>(), {
  startDelay: 0,
  charInterval: 28,
  instant: false,
})

const displayed_text = ref('')

let start_timer: ReturnType<typeof setTimeout> | null = null
let tick_timer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (start_timer) {
    clearTimeout(start_timer)
    start_timer = null
  }

  if (tick_timer) {
    clearTimeout(tick_timer)
    tick_timer = null
  }
}

function prefersReducedMotion(): boolean {
  // #ifdef H5
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  // #endif

  return false
}

function renderText() {
  clearTimers()

  const full_text = props.text ?? ''
  if (!full_text) {
    displayed_text.value = ''
    return
  }

  if (props.instant || prefersReducedMotion()) {
    displayed_text.value = full_text
    return
  }

  displayed_text.value = ''
  let index = 0

  const step = () => {
    index += 1
    displayed_text.value = full_text.slice(0, index)

    if (index < full_text.length) {
      tick_timer = setTimeout(step, props.charInterval)
    }
  }

  start_timer = setTimeout(step, props.startDelay)
}

watch(
  () => [props.text, props.startDelay, props.charInterval, props.instant],
  () => { renderText() },
)

onMounted(() => {
  renderText()
})

onUnmounted(() => {
  clearTimers()
})
</script>

<style scoped>
.typewriter-text {
  display: block;
  white-space: pre-wrap;
}
</style>
