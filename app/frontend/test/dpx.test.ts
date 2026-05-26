// @vitest-environment node

/**
 * dpx 数学契约单测
 *
 * dpx 依赖 `uni.getWindowInfo()`。本套件 mock 全局 `uni`，验证单轴
 * 宽度公式下的转换：clamp(0.872, w/430, 1)。
 * 14PM 恒等，中间按宽缩，iPhone 8 钉下限。
 */

import { afterEach, describe, expect, it } from 'vitest'
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

  it('14PM (430) 下恒等转换', () => {
    mockUniWindow(430, 932)
    expect(dpx(60)).toBe(60)
    expect(dpx(240)).toBe(240)
    expect(dpx(0)).toBe(0)
  })

  it('iPhone 14 (390) 按宽缩到 90.7%', () => {
    mockUniWindow(390, 844)
    expect(dpx(60)).toBeCloseTo(60 * (390 / 430), 5)
    expect(dpx(100)).toBeCloseTo(100 * (390 / 430), 5)
  })

  it('iPhone 8 (375) 钉下限 87.2%', () => {
    mockUniWindow(375, 667)
    expect(dpx(60)).toBeCloseTo(60 * (375 / 430), 5)
  })

  it('PC 1920×1080 钉 1.0', () => {
    mockUniWindow(1920, 1080)
    expect(dpx(60)).toBe(60)
    expect(dpx(240)).toBe(240)
  })

  it('PC 1280×800 钉 1.0（宽够，高度不参与）', () => {
    mockUniWindow(1280, 800)
    expect(dpx(60)).toBe(60)
  })

  it('过小屏 (320,568) 锁底，与 iPhone 8 等价', () => {
    mockUniWindow(320, 568)
    expect(dpx(60)).toBeCloseTo(60 * (375 / 430), 5)
  })

  it('负数值正确缩放（卡牌堆叠偏移）', () => {
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
