// @vitest-environment node

/**
 * design_flexible 数学契约单测
 *
 * 验证范围：纯函数 `computeScale` / `computeRootFontSize` / `isTooSmallView`。
 * `useDesignFlexible` 是 Vue composable，依赖 window/rAF，跨越平台层，不
 * 纳入本套件（与 scale.test.ts 同策略：composable 由 e2e 与运行时实证
 * 覆盖）。
 *
 * 锚点视口：
 *   - iPhone 8        375 × 667  → scale 0.87209…（下限）
 *   - iPhone 14       390 × 844  → scale 0.90698…
 *   - iPhone 14 PM    430 × 932  → scale 1（上限）
 *   - 桌面 1280×800            → scale 1（上限封顶）
 *   - 过小屏 320×568          → scale 0.87209（下限锁），too-small
 */

import { describe, expect, it } from 'vitest'
import {
  BASELINE_W,
  CEILING_RATIO,
  FLOOR_H,
  FLOOR_RATIO,
  FLOOR_W,
  REM_BASE,
  computeRootFontSize,
  computeScale,
  isTooSmallView,
} from '../src/core/sizing/design_flexible'

describe('design_flexible: constants self-consistency', () => {
  it('BASELINE_W 与 REM_BASE 满足 rem 基数 = 宽 / 10 约定', () => {
    expect(REM_BASE).toBe(BASELINE_W / 10)
  })

  it('FLOOR_RATIO 等于 FLOOR_W / BASELINE_W', () => {
    expect(FLOOR_RATIO).toBeCloseTo(FLOOR_W / BASELINE_W, 6)
  })

  it('CEILING_RATIO 为 1（14PM 之上停止放大）', () => {
    expect(CEILING_RATIO).toBe(1)
  })
})

describe('computeScale', () => {
  it('iPhone 14 Pro Max 430 → 1.0（上限锚点）', () => {
    expect(computeScale(BASELINE_W)).toBe(1)
  })

  it('视口宽超过 14PM 时钉死 1.0', () => {
    expect(computeScale(440)).toBe(1)
    expect(computeScale(768)).toBe(1)
    expect(computeScale(1280)).toBe(1)
    expect(computeScale(1920)).toBe(1)
  })

  it('iPhone 8 / SE 375 → FLOOR_RATIO（下限锚点）', () => {
    expect(computeScale(FLOOR_W)).toBeCloseTo(FLOOR_RATIO, 6)
  })

  it('视口宽低于 iPhone 8 时钉死 FLOOR_RATIO（按 iPhone 8 等比）', () => {
    expect(computeScale(360)).toBe(FLOOR_RATIO)
    expect(computeScale(320)).toBe(FLOOR_RATIO)
    expect(computeScale(0)).toBe(FLOOR_RATIO)
  })

  it('iPhone 14 390 → 在 [FLOOR_RATIO, 1) 区间线性', () => {
    const s = computeScale(390)
    expect(s).toBeCloseTo(390 / 430, 6)
    expect(s).toBeGreaterThan(FLOOR_RATIO)
    expect(s).toBeLessThan(1)
  })
})

describe('computeRootFontSize', () => {
  it('14PM 视口 → 43px（rem 基数本身）', () => {
    expect(computeRootFontSize(BASELINE_W)).toBe(REM_BASE)
  })

  it('iPhone 8 视口 → REM_BASE × FLOOR_RATIO ≈ 37.5px', () => {
    expect(computeRootFontSize(FLOOR_W)).toBeCloseTo(REM_BASE * FLOOR_RATIO, 6)
    expect(computeRootFontSize(FLOOR_W)).toBeCloseTo(37.5, 5)
  })

  it('桌面 1280 → 43px（钉上限）', () => {
    expect(computeRootFontSize(1280)).toBe(REM_BASE)
  })

  it('过小屏 320 → 与 iPhone 8 等价', () => {
    expect(computeRootFontSize(320)).toBe(computeRootFontSize(FLOOR_W))
  })
})

describe('isTooSmallView', () => {
  it('正好 iPhone 8 尺寸不算过小（边界含 ≥）', () => {
    expect(isTooSmallView(FLOOR_W, FLOOR_H)).toBe(false)
  })

  it('宽不足 → too-small', () => {
    expect(isTooSmallView(FLOOR_W - 1, FLOOR_H)).toBe(true)
  })

  it('高不足 → too-small', () => {
    expect(isTooSmallView(FLOOR_W, FLOOR_H - 1)).toBe(true)
  })

  it('iPhone 14 / 14PM / iPad / 桌面均不 too-small', () => {
    expect(isTooSmallView(390, 844)).toBe(false)
    expect(isTooSmallView(430, 932)).toBe(false)
    expect(isTooSmallView(768, 1024)).toBe(false)
    expect(isTooSmallView(1280, 800)).toBe(false)
    expect(isTooSmallView(1920, 1080)).toBe(false)
  })
})
