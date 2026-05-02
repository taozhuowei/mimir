/**
 * Module: animation/engine
 * Purpose: animation engine types decoupled from GSAP. Phase plugins consume
 *          AnimationTimeline; adapters implement AnimationEngine.
 * Reason: extracted from core/animation/types.ts during architecture cleanup.
 */

export interface TweenConfig {
  duration?: number
  ease?: string
  delay?: number
  stagger?: number
  overwrite?: boolean | 'auto'
  onUpdate?: () => void
  onComplete?: () => void
}

export interface AnimationTimeline {
  to(target: unknown, vars: Record<string, unknown>, position?: number | string): AnimationTimeline
  fromTo(target: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>, position?: number | string): AnimationTimeline
  add(fn: () => void, position?: number | string): AnimationTimeline
  kill(): void
  clear(): void
  [key: string]: unknown
}

export interface AnimationEngine {
  createTimeline(config?: { paused?: boolean; onComplete?: () => void; onUpdate?: () => void }): AnimationTimeline
  tweenTo(target: unknown, vars: Record<string, unknown>, config?: TweenConfig): { kill(): void }
  killTweensOf(targets: unknown[]): void
}
