/**
 * dpx — 设计 px → 真实 px 转换
 *
 * 用于 JS 字符串拼装 inline style 的场景（GSAP transform / 动态计算样式）。
 * 静态 CSS 中的 px 由 postcss-pxtorem 在编译期自动转 rem，无需调用本工具；
 * JS 输出的 inline style 不经过 PostCSS pipeline，需要手动调用 dpx 把
 * "按 iPhone 14 Pro Max 设计稿真值" 转换为当前视口下应有的真实长度。
 *
 * 公式：dpx(n) = n × computeScale(viewport.w)
 *      = n × clamp(0.872, w/430, 1)
 *
 * 14PM 视口下 dpx(n) === n（恒等）；iPhone 8 下 dpx(n) ≈ 0.872n。
 *
 * 适用场景：硬编码"设计稿真值"的偏移量、字号、间距进入 inline style 或
 * GSAP tween（如 `translateY(60px)` 的 60 是 14PM 真值）。
 *
 * 不适用场景：来自 layout_solver / deriveSizes 等已包含尺寸算法的输出值
 * —— 这些已是按视口算过的真实 px，直接拼接即可，二次缩放会出错。
 *
 * 跨端：H5 端走 uni.getWindowInfo().windowWidth；mp-weixin 同 API 可用，
 * 但 mp 端走 rpx 链不参与 rem 缩放，dpx 输出仍是设计真值（scale=1）。
 */

import { computeScale } from './design_flexible'

/**
 * 把"按 iPhone 14 Pro Max 设计稿真值"转换为当前视口下的真实 px。
 *
 * vitest jsdom 环境下 `uni` 全局未注入，返回设计真值原样（等价 14PM 渲染），
 * 让单测仍可断言组件初始 inline style；运行时（H5/mp）`uni.getWindowInfo`
 * 必然可用，按公式缩放。
 */
export function dpx(designPx: number): number {
  if (typeof uni === 'undefined' || typeof uni.getWindowInfo !== 'function') {
    return designPx
  }
  const w = uni.getWindowInfo().windowWidth
  return designPx * computeScale(w)
}

/** 拼接到 inline style / 模板字符串的便捷形式，附 px 单位。 */
export function dpxStr(designPx: number): string {
  return `${dpx(designPx)}px`
}
