<template>
  <view class="crystal-ball" :class="{ animating: animate }" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <view class="ball-body">
      <view class="ball-glow" />
      <view v-if="animate" class="stars-container">
        <text class="ball-star s1">✦</text>
        <text class="ball-star s2">✧</text>
        <text class="ball-star s3">✦</text>
        <text class="ball-star s4">✧</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  animate?: boolean
  size?: number
}>()
</script>

<style scoped>
.crystal-ball {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ball-body {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(184, 148, 62, 0.3) 30%,
    rgba(92, 61, 46, 0.4) 70%,
    rgba(92, 61, 46, 0.6) 100%
  );
  border: 2px solid var(--color-accent);
  position: relative;
  overflow: hidden;
}

.animating .ball-body {
  animation: ballRotate 3s linear infinite;
}

.ball-glow {
  position: absolute;
  top: 15%;
  left: 20%;
  width: 30%;
  height: 25%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.9), transparent);
  border-radius: 50%;
}

.stars-container {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.ball-star {
  position: absolute;
  color: var(--color-accent);
  font-size: 20rpx;
  animation: starTwinkle 1.5s ease-in-out infinite;
}

.s1 { top: 20%; left: 60%; animation-delay: 0s; }
.s2 { top: 50%; left: 30%; animation-delay: 0.4s; }
.s3 { top: 70%; left: 65%; animation-delay: 0.8s; }
.s4 { top: 35%; left: 50%; animation-delay: 1.2s; }

@keyframes ballRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes starTwinkle {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
