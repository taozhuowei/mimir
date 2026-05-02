/**
 * Name: use_app_phase
 * Purpose: re-export the application-level 4-stage phase ref from the tarot
 *          store and provide named transition helpers, so the main page can
 *          provide() a single phase ref to all views/containers and switch
 *          between idle / divination / reading / decision through a stable
 *          composable contract.
 * Reason: PRD §2.6.1 defines four application stages. The store already owns
 *         the underlying ref (see stores/flow.ts) and the transition helpers
 *         (`startDivination`, `setPhase`, `revealResult`, `enterDecision`,
 *         `reset`). This composable is the seam that views/containers will
 *         consume — keeping them decoupled from the store implementation and
 *         letting future refactors swap the source without touching views.
 * Data flow: tarotStore.phase ──▶ useAppPhase().phase ──▶ provide('appPhase')
 *           Views read it via inject; transitions are triggered by callers
 *           through the helper methods exposed below.
 *
 * Skeleton scope: phase-2.1 ships the read-only ref + thin pass-through
 *                 helpers. The actual transition policy (when to call
 *                 `enterDecision` after the typewriter completes, etc.) is
 *                 wired in 2.2 when business logic migrates into the views.
 */

import { storeToRefs } from 'pinia'
import { useTarotStore } from '../stores/tarot'
import type { DivinationPhase } from '../stores/flow'

export type { DivinationPhase } from '../stores/flow'

export interface UseAppPhaseReturn {
  /** Reactive application-level phase ref, sourced from tarotStore. */
  phase: ReturnType<typeof storeToRefs<ReturnType<typeof useTarotStore>>>['phase']
  /** Move to `divination` and clear any previous reading. */
  startDivination: (question: string) => void
  /** Move to `reading` once the reading payload has landed. */
  enterReading: () => void
  /** Move from `reading` to `decision` after the typewriter completes. */
  enterDecision: () => void
  /** Reset the whole flow back to `idle`. */
  resetToIdle: () => void
  /** Imperative override (escape hatch — prefer the named transitions above). */
  setPhase: (next: DivinationPhase) => void
}

export function useAppPhase(): UseAppPhaseReturn {
  const tarotStore = useTarotStore()
  const { phase } = storeToRefs(tarotStore)

  return {
    phase,
    startDivination: (question: string) => tarotStore.startDivination(question),
    enterReading: () => tarotStore.revealResult(),
    enterDecision: () => tarotStore.enterDecision(),
    resetToIdle: () => tarotStore.reset(),
    setPhase: (next: DivinationPhase) => tarotStore.setPhase(next),
  }
}
