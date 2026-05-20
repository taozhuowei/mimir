/**
 * design_flexible — rem 自适应运行时（H5 端为主，mp 端读静态值）
 *
 * 设计稿基准 iPhone 14 Pro Max（430 × 932 CSS px）。源代码按此基准
 * 写 px，postcss-pxtorem（vite.config.ts）在编译期把 Npx 转 Nrem，
 * 真实渲染长度 = Nrem × 当前 `<html>` font-size。本模块按视口宽度
 * 单轴决定 root font-size，画布宽固定 14PM 设计稿、高度铺满视口
 * （main 分支同款「宽限定 + 高随视口」策略），内部 flex 自适应。
 *
 * 公式：scale = clamp(FLOOR_RATIO, w/430, 1)
 *      rootFontSize = REM_BASE × scale
 *
 * - 上限 1（w ≥ 430）：钉死 14PM 真值，画布宽固定 430，背景拉伸填空
 * - 中间：按宽度等比缩
 * - 下限 FLOOR_RATIO = 375/430 ≈ 0.8721（iPhone 8 宽边界）
 *
 * 高度不参与 scale —— 画布高度由 .main-page/.canvas height:100vh
 * 接管，内部 flex column（HeaderArea + Stage + ActionArea）按视口
 * 高度自适应，与 main 分支视觉等价。视口高 < 932 不触发缩放，仅内部
 * 组件挤压；视口高 < 667 时由 isTooSmallView 触发横幅 + 滚动。
 *
 * DOM 写入由 index.html 顶部 inline 脚本承担（FOUC 防护，必须在 first
 * paint 前完成）。本模块只暴露纯函数 + Vue 响应式 ref 供组件订阅；视口
 * 读取走 `uni.getWindowInfo()` 与 `uni.onWindowResize()`，与 inline
 * 脚本读 `window.innerWidth` 在 H5 端等价（公式同源）。
 *
 * uni-h5 useRem 干扰：@dcloudio/uni-h5 在 DOMContentLoaded / load /
 * resize 时强制写 `html.style.fontSize = innerWidth/23.4375` 为 rpx
 * 链供能，会覆盖本模块写入。反制由 index.html 的 MutationObserver
 * 接管（必须 inline 同步执行，否则 FOUC 期间错位）。
 *
 * mp-weixin 端：rem 链不参与（rpx 自带等比），inline 脚本无 DOM 可写；
 * 本模块仍可被 mp 端 import（uni.getWindowInfo 跨端可用），ref 提供
 * 与 H5 同源的 scale / isTooSmall 信号，给 Vue 渲染层使用（如 banner）。
 *
 * 方案档：docs/research/layout_final_rem.md ／ main_14pm_snapshot.md
 */
import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'
import { raf } from './raf_shim'

/** iPhone 14 Pro Max CSS viewport 宽度，rem 基准的分母 */
export const BASELINE_W = 430
/**
 * iPhone 14 Pro Max CSS viewport 高度。
 * scale 公式不直接用（单轴宽度），但 isTooSmallView 用它做高度过小判定。
 */
export const BASELINE_H = 932
/** iPhone 8 CSS viewport 宽度，下限宽轴边界 */
export const FLOOR_W = 375
/** iPhone 8 CSS viewport 高度，过小屏判定的高度边界 */
export const FLOOR_H = 667
/** rem 基数：BASELINE_W / 10，与 postcss-pxtorem rootValue 一致 */
export const REM_BASE = 43
/** 下限比例：FLOOR_W / BASELINE_W ≈ 0.87209（iPhone 8 宽对齐 14PM 宽） */
export const FLOOR_RATIO = FLOOR_W / BASELINE_W
/** 上限比例：14PM 之上停止放大 */
export const CEILING_RATIO = 1

/**
 * 按 viewport 宽度计算等比缩放因子（单轴）。
 * 公式：clamp(FLOOR_RATIO, w/430, 1)
 *
 * - 宽 ≥ 430：钉 1（14PM 之上不放大，背景拉伸填空）
 * - 375 ≤ 宽 < 430：按宽度线性等比缩
 * - 宽 < 375：钉 FLOOR_RATIO（iPhone 8 锁底，视口宽不足由 banner +
 *   横向 / 纵向 body 滚动兜底）
 *
 * 第二参数 viewportH 仅签名占位，便于调用方传完整 viewport（与 inline
 * 脚本签名同源），不参与 scale 计算 —— 高度由 .canvas height:100vh +
 * 内部 flex column 自适应消化。
 */
// 第二参数刻意未命名为 _ 前缀 + 用 disable 注释，让调用方可传 height 而不
// 触发 unused 警告；本函数不用高度（高度由 .canvas height:100vh 消化）。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function computeScale(viewportW: number, viewportH?: number): number {
  const raw = viewportW / BASELINE_W
  if (raw >= CEILING_RATIO) return CEILING_RATIO
  if (raw <= FLOOR_RATIO) return FLOOR_RATIO
  return raw
}

/** 当前视口下 `<html>` 应有的 font-size（px）。 */
export function computeRootFontSize(viewportW: number, viewportH?: number): number {
  return REM_BASE * computeScale(viewportW, viewportH)
}

/**
 * 是否为过小屏 — 宽 < 375 或 高 < 667。任一条件成立都会显示
 * TooSmallBanner 顶部横幅 + 切到 body overflow:auto 允许滚动兜底：
 * - 宽不足：rem scale 钉下限，画布宽锁 375，左右溢出由横向滚动看完
 * - 高不足：内部 flex 紧凑挤压，多余高度差由纵向滚动看完
 * iPhone 8 真机（375×667）正好在边界上（含 ≥），不触发。
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
