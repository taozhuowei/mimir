// @vitest-environment node

/**
 * dpx 数学契约单测
 *
 * dpx 依赖 `uni.getWindowInfo().windowWidth`。本套件 mock 全局 `uni`，
 * 验证三档视口下的转换结果：iPhone 14 PM（恒等）/ iPhone 14（91%）/
 * iPhone 8（87.2%）。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dpx, dpxStr } from '../src/core/sizing/dpx'

function mockUniWindow(w: number, h: number): void {
  ;(globalThis as unknown as { uni: object }).uni = {
    getWindowInfo: () => ({ windowWidth: w, windowHeight: h }),
  }
}

describe('dpx', () => {
  afterEach(() => {
    delete (globalThis as unknown as { uni?: object }).uni
  })

  it('14PM 视口（430）下恒等转换', () => {
    mockUniWindow(430, 932)
    expect(dpx(60)).toBe(60)
    expect(dpx(240)).toBe(240)
    expect(dpx(0)).toBe(0)
  })

  it('iPhone 14（390）下按 90.7% 缩放', () => {
    mockUniWindow(390, 844)
    expect(dpx(60)).toBeCloseTo(60 * (390 / 430), 5)
    expect(dpx(100)).toBeCloseTo(100 * (390 / 430), 5)
  })

  it('iPhone 8（375）下按下限 87.2% 缩放', () => {
    mockUniWindow(375, 667)
    expect(dpx(60)).toBeCloseTo(60 * (375 / 430), 5)
  })

  it('超过 14PM 视口钉死 1.0', () => {
    mockUniWindow(1280, 800)
    expect(dpx(60)).toBe(60)
    expect(dpx(240)).toBe(240)
  })

  it('过小屏（< 375）锁底，与 iPhone 8 等价', () => {
    mockUniWindow(320, 568)
    const iPhone8Value = 60 * (375 / 430)
    mockUniWindow(320, 568)
    expect(dpx(60)).toBeCloseTo(iPhone8Value, 5)
  })

  it('负数值正确缩放（如卡牌堆叠偏移）', () => {
    mockUniWindow(390, 844)
    expect(dpx(-2.5)).toBeCloseTo(-2.5 * (390 / 430), 5)
  })

  it('dpxStr 附 px 单位', () => {
    mockUniWindow(430, 932)
    expect(dpxStr(60)).toBe('60px')
    mockUniWindow(390, 844)
    expect(dpxStr(60)).toBe(`${60 * (390 / 430)}px`)
  })
})
