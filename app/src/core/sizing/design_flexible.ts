/**
 * design_flexible — rem 自适应运行时（H5 端为主，mp 端读静态值）
 *
 * 设计稿基准 iPhone 14 Pro Max（430 × 932 CSS px）。源代码按此基准
 * 写 px，postcss-pxtorem（vite.config.ts）在编译期把 Npx 转 Nrem，
 * 真实渲染长度 = Nrem × 当前 `<html>` font-size。本模块负责按视口宽
 * 度动态决定 root font-size，使 rem 在不同屏幕下等比缩放。
 *
 * 公式：scale = clamp(FLOOR_RATIO, viewport.w / BASELINE_W, 1)
 *      rootFontSize = REM_BASE × scale
 *
 * - 上限 1（viewport.w ≥ 430）：钉死 14PM 真值，桌面 / 大屏停止放大
 * - 下限 FLOOR_RATIO ≈ 0.872（375 / 430）：低于 iPhone 8 屏宽时按
 *   iPhone 8 等比锁定，TooSmallBanner 提示（见 isTooSmallView），允许
 *   body 滚动 fallback
 *
 * DOM 写入由 index.html 顶部 inline 脚本承担（FOUC 防护，必须在 first
 * paint 前完成）。本模块只暴露纯函数 + Vue 响应式 ref 供组件订阅；视口
 * 读取走 `uni.getWindowInfo()` 与 `uni.onWindowResize()`，与 inline
 * 脚本读 `window.innerWidth` 在 H5 端等价（公式同源）。
 *
 * mp-weixin 端：rem 链不参与（rpx 自带等比），inline 脚本无 DOM 可写；
 * 本模块仍可被 mp 端 import（uni.getWindowInfo 跨端可用），ref 提供
 * 与 H5 同源的 scale / isTooSmall 信号，给 Vue 渲染层使用（如 banner）。
 *
 * 方案档：docs/research/layout_final_rem.md
 */
import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'
import { raf } from './raf_shim'

/** iPhone 14 Pro Max CSS viewport 宽度，rem 基准的分母 */
export const BASELINE_W = 430
/** iPhone 8 CSS viewport 宽度，下限边界 */
export const FLOOR_W = 375
/** iPhone 8 CSS viewport 高度，过小屏判定的高度边界 */
export const FLOOR_H = 667
/** rem 基数：BASELINE_W / 10，与 postcss-pxtorem rootValue 一致 */
export const REM_BASE = 43
/** 下限比例：FLOOR_W / BASELINE_W ≈ 0.87209 */
export const FLOOR_RATIO = FLOOR_W / BASELINE_W
/** 上限比例：14PM 之上停止放大 */
export const CEILING_RATIO = 1

/**
 * 按 viewport 宽度计算等比缩放因子。
 * 单轴宽度公式（高度不参与）：宽 ≥ 430 钉 1，宽 ≤ 375 钉 0.87209，
 * 区间内线性。
 */
export function computeScale(viewportW: number): number {
  const raw = viewportW / BASELINE_W
  if (raw >= CEILING_RATIO) return CEILING_RATIO
  if (raw <= FLOOR_RATIO) return FLOOR_RATIO
  return raw
}

/** 当前视口下 `<html>` 应有的 font-size（px）。 */
export function computeRootFontSize(viewportW: number): number {
  return REM_BASE * computeScale(viewportW)
}

/**
 * 是否为过小屏 — 宽 < 375 或高 < 667。该状态下界面按 iPhone 8 等比
 * 渲染（scale 已锁底），多出尺寸由 body overflow:auto 滚动兜底，并由
 * TooSmallBanner 提示体验受影响。
 */
export function isTooSmallView(viewportW: number, viewportH: number): boolean {
  return viewportW < FLOOR_W || viewportH < FLOOR_H
}

const sharedScale: Ref<number> = ref(CEILING_RATIO)
const sharedTooSmall: Ref<boolean> = ref(false)

let initialized = false
let pendingFrame = 0

function readUniViewport(): { w: number; h: number } {
  const info = uni.getWindowInfo()
  return { w: info.windowWidth, h: info.windowHeight }
}

function recompute(): void {
  pendingFrame = 0
  const { w, h } = readUniViewport()
  sharedScale.value = computeScale(w)
  sharedTooSmall.value = isTooSmallView(w, h)
}

function onResize(): void {
  if (pendingFrame !== 0) return
  pendingFrame = raf(recompute)
}

/**
 * Vue 组件订阅缩放与过小屏状态。模块级单例：多次调用共享同一对 ref，
 * `uni.onWindowResize` 监听只注册一次。组件 scope 销毁时不拆 listener
 * （单例跨 scope 存活），与 scale.ts 同策略。
 *
 * 与 index.html inline 脚本职责分离：inline 脚本写 `<html>` font-size
 * + data-too-small 给 CSS 用；本 composable 给 Vue 模板用（如
 * TooSmallBanner 的 v-if）。两者公式同源，结果一致。
 */
export function useDesignFlexible(): {
  scale: Ref<number>
  isTooSmall: Ref<boolean>
} {
  if (!initialized) {
    initialized = true
    recompute()
    uni.onWindowResize(onResize)
  }
  // 单例跨 scope 存活；per-scope dispose 是 no-op（同 scale.ts 策略）。
  // 这里仍注册一个钩子是为了让 getCurrentScope 路径有占位，便于未来扩展。
  if (getCurrentScope() !== undefined) {
    onScopeDispose(() => { /* singleton outlives per-scope teardown */ })
  }
  return { scale: sharedScale, isTooSmall: sharedTooSmall }
}
