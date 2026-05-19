/**
 * Name: flows/index/composables/use_dev_panel_drag
 * Purpose: owns the DevToolsPanel drag/anchor wiring — position anchor,
 *          dragging flag, edge-aware containerStyle, pointer handlers, and
 *          the drag-tail click suppression — so the panel shell only
 *          concerns itself with layout + visibility.
 * Reason: F3 of the parked-debt cleanup (docs/TODO.md). The shell
 *          previously inlined ~80 lines of drag plumbing alongside its
 *          markup; extracting it keeps the SFC a thin shell. The drag
 *          *algorithm* still lives in core/utils/dev/draggable_panel.ts
 *          (H5-only, browser globals isolated there); this composable is
 *          only the Vue-reactive adapter around it. Pure move — behaviour,
 *          timing and the `containerStyle` formula are byte-for-byte the
 *          panel's previous logic.
 * Data flow: pointer events in → draggable_panel controller mutates the
 *          position anchor → containerStyle recomputes; `consumeClick()`
 *          tells the caller whether a click is the synthetic tail of a
 *          drag and must be swallowed (so it does not toggle the panel).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createDraggablePanel,
  type Position,
} from '../../../core/utils/dev/draggable_panel'

export function useDevPanelDrag() {
  /**
   * Anchor point in viewport pixels (top-left of the panel). Starts null
   * until first mount; resolved to the default bottom-right corner using
   * actual viewport metrics inside the H5-only controller.
   */
  const position = ref<Position | null>(null)
  const isDragging = ref(false)

  /** When true, the next click is the synthetic tail of a drag and must
   *  be swallowed so the gesture doesn't toggle the panel. */
  let suppressNextClick = false

  /**
   * Convert the stored top-left anchor into CSS positioning. When the
   * collapsed handle sits in the right or bottom half of the viewport,
   * pin the panel by its right / bottom edge so expansion grows back
   * toward the centre instead of overflowing the viewport. The default
   * mount position lands at bottom-right, so the expanded body opens
   * up-and-left and stays inside the screen even on phone-shell widths.
   *
   * The viewport is sourced via `uni.getWindowInfo()` so this works on H5
   * and mp-weixin alike — the same call the rest of the codebase uses for
   * window metrics. We re-read on every recompute (cheap, ~µs) so a
   * resize doesn't strand the panel against the wrong edge.
   */
  const containerStyle = computed(() => {
    if (!position.value) return ''
    const { x, y } = position.value
    const win = uni.getWindowInfo()
    const w = win.windowWidth ?? 0
    const h = win.windowHeight ?? 0
    const HANDLE_PX = 40
    const horizontal = w > 0 && x + HANDLE_PX / 2 > w / 2
      ? `right: ${Math.max(0, w - x - HANDLE_PX)}px`
      : `left: ${x}px`
    const vertical = h > 0 && y + HANDLE_PX / 2 > h / 2
      ? `bottom: ${Math.max(0, h - y - HANDLE_PX)}px`
      : `top: ${y}px`
    return `${horizontal}; ${vertical};`
  })

  const dragger = createDraggablePanel({
    setPosition(next) {
      position.value = next
    },
    getPosition() {
      return position.value ?? { x: 0, y: 0 }
    },
    onDragStart() {
      isDragging.value = true
    },
    onDragEnd({ wasDrag }) {
      isDragging.value = false
      if (wasDrag) suppressNextClick = true
    },
  })

  function onMouseDown(e: MouseEvent) {
    // First press also resolves the initial position so the controller has
    // a real anchor to mutate from (mount may run before any layout
    // measurement is meaningful).
    if (!position.value) position.value = dragger.defaultPosition()
    dragger.startMouseDrag(e)
  }

  function onTouchStart(e: TouchEvent) {
    if (!position.value) position.value = dragger.defaultPosition()
    dragger.startTouchDrag(e)
  }

  /**
   * Returns true iff this click is the synthetic tail of a just-finished
   * drag and the caller must swallow it (not toggle the panel). Consumes
   * the one-shot flag.
   */
  function consumeClick(): boolean {
    if (suppressNextClick) {
      suppressNextClick = false
      return true
    }
    return false
  }

  onMounted(() => {
    // Resolve initial position once the H5 controller can read window metrics.
    position.value = dragger.defaultPosition()
  })

  onBeforeUnmount(() => {
    dragger.dispose()
  })

  return { isDragging, containerStyle, onMouseDown, onTouchStart, consumeClick }
}
