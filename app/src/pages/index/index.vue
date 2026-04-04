<template>
  <view class="index-page parchment-bg">
    <view v-if="isIdle" class="idle-view" :style="{ height: windowHeight + 'px' }">
      <!-- 精简头部 - 更紧凑的布局 -->
      <view class="header" :style="{ paddingTop: headerPaddingTop + 'px' }">
        <text class="title font-display">Scales Tarot</text>
        <text class="subtitle">以牌权衡，让塔罗来定夺</text>
        <text class="guidance-text">在心中默念你的问题，轻触法阵，连接灵性的指引</text>
      </view>

      <!-- 神秘圆环 - 强化仪式感和视觉分量 -->
      <view class="circle-area" @click="startDivination">
        <view 
          class="mystic-circle" 
          :style="{ width: layout.circleSize + 'px', height: layout.circleSize + 'px' }"
        >
          <!-- 外发光层 -->
          <view class="glow-ring"></view>
          
          <!-- 轨道圆环 - 共用一个容器确保完美居中 -->
          <view class="orbits-container">
            <view class="orbit orbit-outer"></view>
            <view class="orbit orbit-middle"></view>
            <view class="orbit orbit-inner"></view>
          </view>

          <!-- 核心按钮 -->
          <view class="circle-core">
            <text class="core-symbol">✦</text>
          </view>

          <!-- 轨道粒子 -->
          <view 
            class="orbital-particle particle-1" 
            :style="{ 
              width: layout.particleSize1 + 'px',
              height: layout.particleSize1 + 'px',
              marginLeft: -layout.particleSize1/2 + 'px',
              marginTop: -layout.orbitRadius1 - layout.particleSize1/2 + 'px',
              transformOrigin: '50% ' + (layout.orbitRadius1 + layout.particleSize1/2) + 'px'
            }"
          ></view>
          <view 
            class="orbital-particle particle-2" 
            :style="{ 
              width: layout.particleSize2 + 'px',
              height: layout.particleSize2 + 'px',
              marginLeft: -layout.particleSize2/2 + 'px',
              marginTop: -layout.orbitRadius2 - layout.particleSize2/2 + 'px',
              transformOrigin: '50% ' + (layout.orbitRadius2 + layout.particleSize2/2) + 'px'
            }"
          ></view>
          <view 
            class="orbital-particle particle-3" 
            :style="{ 
              width: layout.particleSize3 + 'px',
              height: layout.particleSize3 + 'px',
              marginLeft: -layout.particleSize3/2 + 'px',
              marginTop: -layout.orbitRadius3 - layout.particleSize3/2 + 'px',
              transformOrigin: '50% ' + (layout.orbitRadius3 + layout.particleSize3/2) + 'px'
            }"
          ></view>
        </view>
        
        <!-- 底部提示 - 更克制的呈现 -->
        <view class="touch-hint">
          <view class="hint-line"></view>
          <text class="hint-text">轻触召唤</text>
          <view class="hint-line"></view>
        </view>
      </view>
    </view>

    <!-- 角落装饰 - 增强古典边框感 -->
    <view class="corner-decoration corner-tl"></view>
    <view class="corner-decoration corner-tr"></view>
    <view class="corner-decoration corner-bl"></view>
    <view class="corner-decoration corner-br"></view>
    
    <!-- 神秘光晕 - 深色背景氛围 -->
    <view class="ambient-glow glow-tl"></view>
    <view class="ambient-glow glow-br"></view>

    <DivinationOverlay
      v-if="tarotStore.isAnimating || tarotStore.isResultVisible"
      @restart="restartDivination"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, onMounted } from 'vue'
import DivinationOverlay from '../../components/DivinationOverlay.vue'
import { useTarotStore } from '../../stores/tarot'

const tarotStore = useTarotStore()
const isIdle = computed(() => tarotStore.isIdle)

// 窗口可用高度（excludes 导航栏）；setup 阶段同步读取，防止首帧闪烁
const windowHeight = ref((() => {
  try { return uni.getWindowInfo().windowHeight } catch { return 600 }
})())
// 顶部内边距：小程序取胶囊按钮底部偏移，H5 取默认值
const headerPaddingTop = ref(20)

/**
 * 布局计算 - 使用绝对 px 值
 */
const layout = ref({
  circleSize: 320,      // 增大圆环直径（px）
  orbitRadius1: 160,    // 外层：100%
  orbitRadius2: 120,    // 中层：75%
  orbitRadius3: 80,     // 内层：50%
  particleSize1: 8,     // 增大粒子
  particleSize2: 6,
  particleSize3: 7,
})

// 根据屏幕尺寸计算布局
function calculateLayout() {
  try {
    const windowInfo = uni.getWindowInfo()
    const screenWidth = windowInfo.screenWidth
    const screenHeight = windowInfo.windowHeight
    
    // Save window height for page sizing
    windowHeight.value = windowInfo.windowHeight
    
    // Calculate header padding top based on platform
    // #ifdef MP-WEIXIN
    try {
      const menuButtonRect = uni.getMenuButtonBoundingClientRect()
      headerPaddingTop.value = menuButtonRect.bottom + 8
    } catch (e) {
      headerPaddingTop.value = 20
    }
    // #endif
    // #ifdef H5
    headerPaddingTop.value = 20
    // #endif
    
    // rpx 换算比例
    const rpxRatio = screenWidth / 750
    
    // 圆环大小：根据屏幕高度比例计算，确保在不同尺寸设备上都有良好展示
    // 目标：圆环占屏幕高度的 35-42%
    const targetSize = Math.min(screenHeight * 0.38, screenWidth * 0.75)
    const finalCircleSize = Math.round(Math.min(targetSize, 520)) // 最大 520px
    
    // 计算圆环半径
    const circleRadius = finalCircleSize / 2
    
    // 轨道半径
    const orbitRadius1 = Math.round(circleRadius * 1.0)
    const orbitRadius2 = Math.round(circleRadius * 0.72)
    const orbitRadius3 = Math.round(circleRadius * 0.44)
    
    // 粒子尺寸（随屏幕缩放）
    const scale = Math.min(screenWidth / 375, 1.2) // 限制最大缩放
    const particleSize1 = Math.max(6, Math.round(8 * scale))
    const particleSize2 = Math.max(4, Math.round(6 * scale))
    const particleSize3 = Math.max(5, Math.round(7 * scale))
    
    layout.value = {
      circleSize: finalCircleSize,
      orbitRadius1,
      orbitRadius2,
      orbitRadius3,
      particleSize1,
      particleSize2,
      particleSize3,
    }
    
    console.log('Screen:', screenWidth, 'x', screenHeight, 'Layout:', layout.value)
  } catch (e) {
    console.error('Failed to calculate layout:', e)
  }
}

onMounted(() => {
  calculateLayout()
  
  // 监听窗口变化
  uni.onWindowResize(() => {
    calculateLayout()
  })
})

function startDivination() {
  tarotStore.startDivination('')
}

function restartDivination() {
  tarotStore.reset()
  nextTick(() => {
    uni.pageScrollTo({ scrollTop: 0, duration: 0 })
  })
}
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.index-page.is-result-view {
  overflow: hidden;
}

.idle-view {
  /* 高度由 JS 精确注入，避免 100vh 在小程序中含导航栏导致居中偏移 */
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

/* 精简头部 - 更紧凑的布局 */
.header {
  padding-left: var(--space-5);
  padding-right: var(--space-5);
  padding-bottom: var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.title {
  font-size: 52rpx;
  color: var(--color-text-primary);
  letter-spacing: 0.12em;
  text-shadow: 0 4rpx 20rpx rgba(122, 92, 20, 0.15);
}

.subtitle {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  letter-spacing: 0.2em;
  font-family: var(--font-body);
}

.guidance-text {
  max-width: 620rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  font-family: var(--font-body);
  text-align: center;
  text-wrap: balance;
  opacity: 0.92;
}

/* 圆环区域 - 占据主要视觉空间 */
.circle-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4) 0 calc(env(safe-area-inset-bottom, 0px) + 80rpx);
}

/* 神秘圆环 - 使用 flex 完美居中 */
.mystic-circle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 确保在 flex 容器中居中 */
  align-self: center;
}

/* 外发光层 */
.glow-ring {
  position: absolute;
  top: -5%;
  left: -5%;
  width: 110%;
  height: 110%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(122, 92, 20, 0.06) 0%, transparent 70%);
  pointer-events: none;
  animation: pulse-glow 4s ease-in-out infinite;
}

/* 轨道圆环容器 - 绝对定位完美居中 */
.orbits-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1rpx solid var(--color-border);
}

.orbit-outer {
  width: 100%;
  height: 100%;
  border-color: rgba(122, 92, 20, 0.22);
  animation: spin-cw 24s linear infinite;
}

.orbit-middle {
  width: 72%;
  height: 72%;
  border-color: rgba(122, 92, 20, 0.30);
  border-style: dashed;
  animation: spin-ccw 18s linear infinite;
}

.orbit-inner {
  width: 44%;
  height: 44%;
  border-color: rgba(122, 92, 20, 0.40);
  animation: spin-cw 12s linear infinite;
}

/* 核心按钮 - 增强金属质感 */
.circle-core {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%,
    rgba(184, 148, 80, 0.25) 0%,
    rgba(158, 122, 28, 0.15) 50%,
    rgba(122, 92, 20, 0.10) 100%);
  border: 2rpx solid rgba(122, 92, 20, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
  box-shadow:
    0 12rpx 48rpx rgba(122, 92, 20, 0.20),
    inset 0 2rpx 4rpx rgba(255, 255, 255, 0.2),
    inset 0 -2rpx 4rpx rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* #ifdef H5 */
.circle-core {
  backdrop-filter: blur(12rpx);
}
/* #endif */

.mystic-circle:active .circle-core {
  transform: scale(0.96);
  box-shadow:
    0 8rpx 32rpx rgba(122, 92, 20, 0.18),
    inset 0 2rpx 4rpx rgba(255, 255, 255, 0.15);
}

.core-symbol {
  font-size: 56rpx;
  color: var(--color-accent);
  animation: pulse 3s ease-in-out infinite;
  text-shadow: 0 0 24rpx rgba(122, 92, 20, 0.50);
}

/* 轨道粒子 - 增强发光效果 */
.orbital-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 20rpx var(--color-accent), 0 0 40rpx rgba(122, 92, 20, 0.35);
}

.particle-1 {
  animation: orbit-rotate 24s linear infinite;
}

.particle-2 {
  opacity: 0.85;
  animation: orbit-rotate 18s linear infinite reverse;
}

.particle-3 {
  opacity: 0.7;
  animation: orbit-rotate 12s linear infinite;
}

/* 底部提示 - 克制的呈现 */
.touch-hint {
  margin-top: 60rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  opacity: 0.6;
  animation: breathe 3s ease-in-out infinite;
}

.hint-line {
  width: 60rpx;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, var(--color-border-strong), transparent);
}

.hint-text {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  letter-spacing: 0.15em;
  font-family: var(--font-body);
}

/* 角落装饰 - 增强古典感 */
.corner-decoration {
  position: absolute;
  width: 100rpx;
  height: 100rpx;
  border: 2rpx solid var(--color-border);
  opacity: 0.35;
  pointer-events: none;
}

.corner-tl { 
  top: calc(env(safe-area-inset-top, 44px) + 40rpx); 
  left: 40rpx; 
  border-right: none; 
  border-bottom: none; 
  border-top-left-radius: 20rpx;
}
.corner-tr { 
  top: calc(env(safe-area-inset-top, 44px) + 40rpx); 
  right: 40rpx; 
  border-left: none; 
  border-bottom: none; 
  border-top-right-radius: 20rpx;
}
.corner-bl { 
  bottom: calc(env(safe-area-inset-bottom, 0px) + 40rpx); 
  left: 40rpx; 
  border-right: none; 
  border-top: none; 
  border-bottom-left-radius: 20rpx;
}
.corner-br { 
  bottom: calc(env(safe-area-inset-bottom, 0px) + 40rpx); 
  right: 40rpx; 
  border-left: none; 
  border-top: none; 
  border-bottom-right-radius: 20rpx;
}

/* 环境光晕 - 深色氛围 */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80rpx);
}

.glow-tl {
  width: 600rpx;
  height: 600rpx;
  top: -200rpx;
  left: -200rpx;
  background: radial-gradient(circle, rgba(100, 60, 20, 0.08) 0%, transparent 70%);
}

.glow-br {
  width: 700rpx;
  height: 700rpx;
  bottom: -250rpx;
  right: -250rpx;
  background: radial-gradient(circle, rgba(122, 92, 20, 0.06) 0%, transparent 70%);
}

/* #ifdef MP-WEIXIN */
.ambient-glow {
  opacity: 0.7;
}
/* #endif */

/* 响应式 */
@media (min-width: 768px) {
  /* 注意：.header padding-top 由 JS 内联注入，不在此覆盖 */

  .title {
    font-size: 64rpx;
  }
  
  .subtitle {
    font-size: 32rpx;
  }

  .guidance-text {
    max-width: 680rpx;
    font-size: 28rpx;
  }
  
  .circle-core {
    width: 160rpx;
    height: 160rpx;
  }
  
  .core-symbol {
    font-size: 64rpx;
  }
}

/* 动画 */
@keyframes orbit-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.1); opacity: 1; }
}

@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

@keyframes spin-cw {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes spin-ccw {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
</style>
