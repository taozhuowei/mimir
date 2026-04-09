# Brief: Auto-Flow + 4-Icon Progress + Configurable Card Count

## Background

The divination overlay currently requires users to manually click buttons to advance through
shuffle → cut → draw phases. The phase indicator shows a single crossfading icon.
We want: auto-flow (no user buttons between phases), a 4-icon horizontal progress bar,
configurable card count (default 1), and result type renamed to positive/negative.

---

## FILE 1: app/src/config.json  (NEW FILE)

DO: Create this file.

```json
{
  "cardCount": 1
}
```

CONSTRAINTS:
- `cardCount` must be an integer in range 1–3.
- This file is the single source of truth for card count; no other file should hardcode 1, 2, or 3.

---

## FILE 2: app/src/utils/tarotReading.ts

DO: Two changes.

### 2a. Rename result type
Change `ReadingResult.result` from `'yes' | 'no'` to `'positive' | 'negative'`.

### 2b. Generalize drawThreeCards to drawCards(n)
Current function signature:
```ts
export function drawThreeCards(all_cards: TarotCardInfo[]): DrawnResult[]
```
Change to:
```ts
export function drawCards(all_cards: TarotCardInfo[], count: number): DrawnResult[]
```
- Draw exactly `count` cards (Fisher-Yates partial shuffle, same logic, just replace hardcoded 3 with `count`).
- Keep function name `drawCards` (not `drawThreeCards`).

CONSTRAINTS:
- Do NOT change any other logic or types in this file.
- The `DrawnResult` and `TarotCardInfo` interfaces are unchanged.

---

## FILE 3: app/src/stores/tarot.ts

DO: Two changes.

### 3a. Import cardCount from config
```ts
import config from '../config.json'
const CARD_COUNT: number = config.cardCount
```

### 3b. Update drawThreeCards to use CARD_COUNT
Current call: `const drawn = drawCards(allCards.value)` (after you rename in FILE 2).
Change to: `const drawn = drawCards(allCards.value, CARD_COUNT)`

Also rename the store function from `drawThreeCards` to `drawCards` to match.
Update all internal references (the function is exported via `return { ..., drawCards, ... }`).

CONSTRAINTS:
- All references to the store's `drawThreeCards` function name must be updated to `drawCards`.
- Check `app/src/components/DivinationOverlay.vue` — it calls `tarotStore.drawThreeCards()` in `playDraw()`; update that call too.

---

## FILE 4: app/src/components/DivinationOverlay.vue

This is the main file. Changes are grouped below.

### 4a. Add config import at top of script
```ts
import config from '../config.json'
const CARD_COUNT: number = config.cardCount
```

### 4b. Remove ALL _phaseIndicator code
Remove these (search and delete):
- `const _phaseIndicator = { progress: 0 }`
- The entire `refreshPhaseIndicator()` function (lines ~466-478)
- The entire `resetPhaseIndicatorProgress()` function (lines ~480-483)
- `phaseIconInactiveStyle`, `phaseIconActiveStyle`, `phaseIconGlowStyle` ref declarations (lines ~398-400)
- All calls to `resetPhaseIndicatorProgress()` — there are 3: in onMounted (line ~562), in playShuffle (line ~641 area), in playDraw's revealing callback
- The 3 lines that set `_phaseIndicator.progress = 1` in playShuffle, playCut, and playDraw (added in previous commit)
- The extra `refreshPhaseIndicator()` call in playDraw's revealing callback
- `_phaseIndicator` from the `gsap.killTweensOf([...])` array in onUnmounted

### 4c. Remove dead code: actionDone, phasePrompt
Remove:
- `const actionDone = ref(false)` declaration
- `const phasePrompt = ref(...)` declaration
- All assignments to `actionDone.value` and `phasePrompt.value` throughout the file
- The `overlay_text` keys that are no longer needed:
  `prompt_shuffle`, `prompt_shuffling`, `prompt_cut`, `prompt_cutting`, `prompt_draw`, `prompt_drawing`, `start_shuffle`, `shuffle_again`, `start_cut`, `cut_again`, `start_draw`, `result`
  Keep: `prompt_drawing` only if still shown somewhere; keep `revealed`, `restart`, `position_upright`, `position_reversed`.
  Actually: remove the entire `overlay_text` object if it becomes empty after removing keys. Keep only what's still used in template.

### 4d. Phase indicator: replace single icon with horizontal 4-icon progress bar

**Remove from template** (the current progress-header content):
```html
<view :key="phase" class="phase-indicator">
  <image class="phase-icon phase-icon-inactive" :src="currentPhaseInactiveIcon" :style="phaseIconInactiveStyle" mode="aspectFit" />
  <image class="phase-icon phase-icon-active" :src="currentPhaseActiveIcon" :style="phaseIconActiveStyle" mode="aspectFit" />
  <view class="phase-icon-glow" :style="phaseIconGlowStyle" />
</view>
```

**Remove from script**:
- `currentPhaseStep` computed
- `currentPhaseActiveIcon` computed
- `currentPhaseInactiveIcon` computed

**Add to script**:
```ts
// Index of the current phase in phaseSteps (0=shuffling, 1=cutting, 2=drawing, 3=revealing)
const activePhaseIndex = computed(() =>
  phaseSteps.findIndex(s => s.phase === phase.value)
)
```

**Add to template** (replace the removed block, inside progress-header):
```html
<view class="phase-progress-bar">
  <view
    v-for="(step, idx) in phaseSteps"
    :key="step.phase"
    class="phase-step"
  >
    <image
      class="phase-step-icon"
      :src="idx <= activePhaseIndex ? themeStore.getUiAsset(step.activeIcon) || themeStore.getUiAsset(step.inactiveIcon) : themeStore.getUiAsset(step.inactiveIcon) || themeStore.getUiAsset(step.activeIcon)"
      mode="aspectFit"
    />
  </view>
</view>
```

**Add CSS** (replace the old .phase-indicator / .phase-icon-* rules, ~lines 1113-1140):
```css
.phase-progress-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.phase-step {
  display: flex;
  align-items: center;
  justify-content: center;
}

.phase-step-icon {
  width: 28px;
  height: 28px;
  transition: opacity 0.2s ease;
}
```

The visual difference between active/inactive icons is already baked into the icon image files
(icon-wands.png vs icon-wands-inactive.png). No extra opacity/scale styling needed.

### 4e. Auto-flow: remove manual buttons, chain animations automatically

**Template changes** — remove the entire `<template v-else-if="phase === 'shuffling'">` block
and the `<template v-else-if="phase === 'cutting'">` block from action-footer.
Keep only:
```html
<template v-if="showResults">
  <view class="btn btn-primary" @click="handleRestart">{{ overlay_text.restart }}</view>
</template>
<template v-else-if="phase === 'revealing'">
  <view class="revealing-hint font-display">
    {{ overlay_text.revealing }}<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
  </view>
</template>
```

**Script changes** — chain animations automatically:

In `entryTimeline` onComplete (inside onMounted, ~line 564), after
`entryAnimationComplete.value = true` and `entryTimeline = null`, add:
```ts
setTimeout(() => { playShuffle() }, 300)
```

In `playShuffle` timeline onComplete, replace:
```ts
actionDone.value = true
phasePrompt.value = overlay_text.prompt_cut
```
With:
```ts
playCut()
```

In `playCut` timeline onComplete, replace:
```ts
actionDone.value = true
phasePrompt.value = overlay_text.prompt_draw
```
With:
```ts
playDraw()
```

`playDraw` already chains to revealing/finish automatically — no change needed there.

### 4f. Configurable card count: resize _draws, _inners, drawsVisible, drawsStyle

**State arrays** — change hardcoded 3 to CARD_COUNT:

```ts
// Before:
const drawsVisible = ref<boolean[]>([false, false, false])
const drawsStyle = ref<string[]>(['', '', ''])
const innersStyle = ref<string[]>(['', '', ''])

// After:
const drawsVisible = ref<boolean[]>(Array(CARD_COUNT).fill(false))
const drawsStyle = ref<string[]>(Array(CARD_COUNT).fill(''))
const innersStyle = ref<string[]>(Array(CARD_COUNT).fill(''))
```

**GSAP state objects** — change hardcoded-3 arrays:
```ts
// Before:
const _draws: CenterCardState[] = [
  { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 20 },
  { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 19 },
  { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 18 },
]
const _inners: InnerState[] = [
  { rotationY: 0 }, { rotationY: 0 }, { rotationY: 0 },
]

// After:
const _draws: CenterCardState[] = Array.from({ length: CARD_COUNT }, (_, i) => ({
  x: 0, y: 0, rotation: 0, scale: 1, opacity: 0, zIndex: 20 - i,
}))
const _inners: InnerState[] = Array.from({ length: CARD_COUNT }, () => ({ rotationY: 0 }))
```

**playDraw forEach** — change `[0, 1, 2].forEach` to:
```ts
Array.from({ length: CARD_COUNT }, (_, i) => i).forEach((index) => {
```

**getDrawLayout** — add `card_count` parameter and return correctly sized arrays:
```ts
function getDrawLayout(
  stage_width: number,
  stage_height: number,
  card_width: number,
  card_height: number,
  is_wide: boolean,
  card_count: number,   // NEW parameter
) {
  // ... existing margin/offset calculations unchanged ...

  if (card_count === 1) {
    const center_y = clamp(lift_y, min_center_y, max_center_y)
    return {
      liftY: lift_y,
      targetX: [0],
      targetY: [center_y],
    }
  }

  if (card_count === 2) {
    const half_offset = Math.min(card_width * 0.7, max_center_x)
    const center_y = clamp(lift_y, min_center_y, max_center_y)
    if (is_wide) {
      return {
        liftY: lift_y,
        targetX: [-half_offset, half_offset],
        targetY: [center_y, center_y],
      }
    }
    const mobile_spread_2 = Math.min(card_height * 0.6, (max_center_y - min_center_y) / 2)
    const mobile_center_y_2 = clamp(lift_y, min_center_y + mobile_spread_2, max_center_y - mobile_spread_2)
    return {
      liftY: lift_y,
      targetX: [0, 0],
      targetY: [mobile_center_y_2 + mobile_spread_2, mobile_center_y_2 - mobile_spread_2],
    }
  }

  // card_count === 3: existing logic unchanged
  if (is_wide) {
    const centered_row_y = clamp(lift_y, min_center_y, max_center_y)
    return {
      liftY: lift_y,
      targetX: [-side_offset, 0, side_offset],
      targetY: [centered_row_y, centered_row_y, centered_row_y],
    }
  }
  const available_mobile_span = Math.max(0, max_center_y - min_center_y)
  const mobile_spread = Math.min(card_height * 1.12, available_mobile_span / 2)
  const mobile_center_y = clamp(lift_y, min_center_y + mobile_spread, max_center_y - mobile_spread)
  return {
    liftY: lift_y,
    targetX: [0, 0, 0],
    targetY: [mobile_center_y + mobile_spread, mobile_center_y, mobile_center_y - mobile_spread],
  }
}
```

Update the call site in `playDraw()`:
```ts
const draw_layout = getDrawLayout(stage_width, stage_height, card_width, card_height, isWide.value, CARD_COUNT)
```

Update the call site in `updateLayout()` similarly (it also calls getDrawLayout).

**Template** — the `v-for="idx in [0, 1, 2]"` for draw-wrapper and card-3d-inner:
Change to `v-for="(_, idx) in drawsVisible"` (or similar) so it loops CARD_COUNT times.

Also, the upright/reversed badge accesses `tarotStore.drawnCards[idx]` — safe for any count.

**tarotStore.drawCards** call in playDraw — update to call `tarotStore.drawCards()` (not `drawThreeCards()`).

---

## FILE 5: app/src/utils/result_panel.ts

DO: Update the two Record keys from 'yes'/'no' to 'positive'/'negative'.

```ts
const RESULT_INDICATION_MAP: Record<ReadingResult['result'], string> = {
  positive: '积极',
  negative: '消极'
}

const SUMMARY_LEAD_MAP: Record<ReadingResult['result'], string> = {
  positive: '当前牌面传递出积极信号',
  negative: '当前牌面传递出谨慎信号'
}
```

CONSTRAINTS: Do not change anything else in this file.

---

## FILE 6: server/src/services/tarot_reading.ts

DO: Rename result type from 'yes'/'no' to 'positive'/'negative'.

```ts
// Interface change:
export interface ReadingResult {
  result: 'positive' | 'negative'   // was: 'yes' | 'no'
  score: number
  cardDetails: CardDetail[]
}

// Return value change:
return {
  result: total_score > 0 ? 'positive' : 'negative',   // was: 'yes' : 'no'
  ...
}
```

CONSTRAINTS: Do not change any other logic.

---

## FORBIDDEN (all files)

- Do NOT add error handling, loading states, or fallbacks beyond what already exists.
- Do NOT add new dependencies.
- Do NOT change animation timing, easing, or GSAP logic beyond what is specified.
- Do NOT rename variables or functions beyond what is specified.
- Do NOT add new UI components or screens.
- Do NOT modify the server routes or API contract (only the service layer type).
- Do NOT change GSAP state objects (_bg, _stage, _header, _footer, _initials, _lefts, _rights, _cutTop, _cutMid, _cutBot) — only _draws, _inners, drawsVisible, drawsStyle, innersStyle are resized.
- The `v-for="idx in [0, 1, 2]"` in draw-container must use CARD_COUNT-based iteration, not hardcoded 3.
- Do NOT break the v-show bindings for drawsVisible[idx] — they must remain correct.

---

## Verification checklist (after implementation)

- config.json exists with cardCount:1
- drawCards(allCards, 1) draws exactly 1 card
- Overlay opens, shuffle starts automatically (no button needed)
- Shuffle completes, cut starts automatically
- Cut completes, draw starts automatically, 1 card falls, flip, result
- Horizontal progress bar shows 4 icons: current and previous phases lit
- Result panel shows ji qi / xiao ji (not yes/no)
- No TypeScript errors
