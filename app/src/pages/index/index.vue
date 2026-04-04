<template>
  <view class="index-page parchment-bg">
    <view v-if="isIdle" class="idle-view">
      <!-- 精简头部 - 更紧凑的布局 -->
      <view class="header" :style="{ paddingTop: headerPaddingTop + 'px' }">
        <text class="title font-display">Scales Tarot</text>
        <text class="subtitle">以牌权衡，让塔罗来定夺</text>
        <text class="guidance-text">在心中默念你的问题，轻触法阵，连接灵性的指引</text>
      </view>

      <!-- 神秘圆环区域 -->
      <view class="circle-area" @click="startDivination">
        <view 
          class="mystic-circle" 
          :style="{ width: layout.circleSize + 'px', height: layout.circleSize + 'px' }"
        >
          <!-- 外发光层 -->
          <view class="glow-ring"></view>
          
          <!-- 轨道圆环 -->
          <view class="orbits-container">
            <view class="orbit orbit-outer"></view>
            <view class="orbit orbit-middle"></view>
            <view class="orbit orbit-inner"></view>
          </view>

          <!-- 核心按钮 -->
          <view class="circle-core">
            <text class="core-symbol">✦</text>
          </view>

          <!-- 轨道粒子 - 采用更稳定的包装器旋转方案 -->
          <view class="particle-wrapper p-wrap-1" :style="{ animationDuration: '24s' }">
            <view 
              class="orbital-particle particle-1" 
              :style="{ 
                width: layout.particleSize1 + 'px',
                height: layout.particleSize1 + 'px',
                top: -layout.orbitRadius1 + 'px'
              }"
            ></view>
          </view>
          
          <view class="particle-wrapper p-wrap-2" :style="{ animationDuration: '18s' }">
            <view 
              class="orbital-particle particle-2" 
              :style="{ 
                width: layout.particleSize2 + 'px',
                height: layout.particleSize2 + 'px',
                top: -layout.orbitRadius2 + 'px'
              }"
            ></view>
          </view>
          
          <view class="particle-wrapper p-wrap-3" :style="{ animationDuration: '12s' }">
            <view 
              class="orbital-particle particle-3" 
              :style="{ 
                width: layout.particleSize3 + 'px',
                height: layout.particleSize3 + 'px',
                top: -layout.orbitRadius3 + 'px'
              }"
            ></view>
          </view>
        </view>
        
        <!-- 底部提示 - 绝对定位确保不干扰圆环居中 -->
        <view class="touch-hint">
          <view class="hint-line"></view>
          <text class="hint-text">轻触召唤</text>
          <view class="hint-line"></view>
        </view>
      </view>
    </view>

    <!-- 角落装饰 -->
    <view class="corner-decoration corner-tl"></view>
    <view class="corner-decoration corner-tr"></view>
    <view class="corner-decoration corner-bl"></view>
    <view class="corner-decoration corner-br"></view>
    
    <!-- 神秘光晕 -->
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

// 顶部内边距：小程序取胶囊按钮底部偏移，H5 取默认值
const headerPaddingTop = ref(20)

/**
 * 布局计算 - 保持响应式但简化逻辑
 */
const layout = ref({
  circleSize: 320,
  orbitRadius1: 160,
  orbitRadius2: 120,
  orbitRadius3: 80,
  particleSize1: 8,
  particleSize2: 6,
  particleSize3: 7,
})

function calculateLayout() {
  try {
    const windowInfo = uni.getWindowInfo()
    const screenWidth = windowInfo.screenWidth
    const screenHeight = windowInfo.windowHeight
    
    // #ifdef MP-WEIXIN
    try {
      const menuButtonRect = uni.getMenuButtonBoundingClientRect()
      headerPaddingTop.value = menuButtonRect.bottom + 8
    } catch (e) {
      headerPaddingTop.value = 20
    }
    // #endif
    
    // 目标：圆环直径占屏幕宽度的 75% 或高度的 35%，取较小值以防溢出
    const targetSize = Math.min(screenHeight * 0.35, screenWidth * 0.75)
    // 确保为偶数，方便完美对齐
    let finalCircleSize = Math.round(Math.min(targetSize, 480))
    if (finalCircleSize % 2 !== 0) finalCircleSize -= 1
    
    const circleRadius = finalCircleSize / 2
    
    // 轨道半径：使用精确比例
    const orbitRadius1 = circleRadius
    const orbitRadius2 = Math.round(circleRadius * 0.72)
    const orbitRadius3 = Math.round(circleRadius * 0.44)
    
    // 粒子尺寸
    const scale = Math.min(screenWidth / 375, 1.1)
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
  } catch (e) {
    console.error('Failed to calculate layout:', e)
  }
}

onMounted(() => {
  calculateLayout()
  uni.onWindowResize(calculateLayout)
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.idle-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

.header {
  padding-left: var(--space-5);
  padding-right: var(--space-5);
  padding-bottom: var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
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
}

.guidance-text {
  max-width: 620rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-text-tertiary);
  opacity: 0.85;
}

/* 圆环区域 - 核心改进：使用 flex: 1 和 margin: auto 实现真正的居中 */
.circle-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
}

.mystic-circle {
  margin: auto; /* 关键：在 flex 容器中自动分配空间，实现上下左右完美居中 */
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.glow-ring {
  position: absolute;
  inset: -10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(122, 92, 20, 0.08) 0%, transparent 70%);
  pointer-events: none;
  animation: pulse-glow 4s ease-in-out infinite;
}

.orbits-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.orbit {
  position: absolute;
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

.circle-core {
  width: 130rpx;
  height: 130rpx;
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
  box-shadow: 0 10rpx 40rpx rgba(122, 92, 20, 0.20);
}

.core-symbol {
  font-size: 52rpx;
  color: var(--color-accent);
  animation: pulse 3s ease-in-out infinite;
}

/* 粒子包装器：负责旋转 */
.particle-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.p-wrap-1 { animation: spin-cw linear infinite; }
.p-wrap-2 { animation: spin-ccw linear infinite; }
.p-wrap-3 { animation: spin-cw linear infinite; }

.orbital-particle {
  position: absolute;
  left: 0;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 15rpx var(--color-accent);
}

.touch-hint {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 60rpx);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  opacity: 0.5;
  animation: breathe 3s ease-in-out infinite;
}

.hint-line {
  width: 50rpx;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, var(--color-border-strong), transparent);
}

.hint-text {
  font-size: 22rpx;
  letter-spacing: 0.1em;
}

/* 装饰 */
.corner-decoration {
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  border: 2rpx solid var(--color-border);
  opacity: 0.3;
  pointer-events: none;
}

.corner-tl { top: calc(env(safe-area-inset-top, 0px) + 30rpx); left: 30rpx; border-right: none; border-bottom: none; }
.corner-tr { top: calc(env(safe-area-inset-top, 0px) + 30rpx); right: 30rpx; border-left: none; border-bottom: none; }
.corner-bl { bottom: calc(env(safe-area-inset-bottom, 0px) + 30rpx); left: 30rpx; border-right: none; border-top: none; }
.corner-br { bottom: calc(env(safe-area-inset-bottom, 0px) + 30rpx); right: 30rpx; border-left: none; border-top: none; }

.ambient-glow {
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(100rpx);
  opacity: 0.5;
}
.glow-tl { top: -150rpx; left: -150rpx; background: radial-gradient(circle, rgba(122, 92, 20, 0.1) 0%, transparent 70%); }
.glow-br { bottom: -150rpx; right: -150rpx; background: radial-gradient(circle, rgba(122, 92, 20, 0.08) 0%, transparent 70%); }

@keyframes spin-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spin-ccw {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

@keyframes breathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
</style>
