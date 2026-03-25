<template>
  <view class="splash-page parchment-bg kraft-noise">
    <!-- 装饰星星 -->
    <view class="stars">
      <text class="star star-1">✦</text>
      <text class="star star-2">✦</text>
      <text class="star star-3">✦</text>
    </view>

    <!-- Logo 区域 -->
    <view class="logo-area">
      <image
        class="app-logo"
        src="/static/icons/app_logo.png"
        mode="aspectFit"
      />
      <text class="app-title font-heading brass-text">AI Tarot</text>
      <text class="app-subtitle">Yes or No</text>
    </view>

    <!-- 性别选择与入口 -->
    <view class="entry-area">
      <text class="entry-prompt font-heading">请选择您的占卜身份</text>
      <view class="avatar-selectors">
        <view
          class="avatar-option rounded-full-crop border-brass"
          :class="{ selected: gender === 'female' }"
          @click="selectGender('female')"
        >
          <image class="avatar-img" src="/static/icons/user_avatar_female.png" />
          <view v-if="gender === 'female'" class="golden-ring" />
        </view>
        <view
          class="avatar-option rounded-full-crop border-brass"
          :class="{ selected: gender === 'male' }"
          @click="selectGender('male')"
        >
          <image class="avatar-img" src="/static/icons/user_avatar_male.png" />
          <view v-if="gender === 'male'" class="golden-ring" />
        </view>
      </view>
      
      <view
        class="btn btn-primary start-btn font-heading"
        :class="{ disabled: !gender }"
        @click="startJourney"
      >
        开始占卜之旅
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const gender = ref<'male'|'female'|null>(userStore.gender || null)

function selectGender(g: 'male'|'female') {
  gender.value = g
}

function startJourney() {
  if (!gender.value) return
  
  userStore.gender = gender.value
  userStore.avatar = gender.value === 'female'
    ? '/static/icons/user_avatar_female.png'
    : '/static/icons/user_avatar_male.png'
  userStore.isOnboarded = true
  
  uni.redirectTo({ url: '/pages/chat/index' })
}
</script>

<style scoped>
.splash-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
  z-index: 2;
}

.app-logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
  border-radius: 50%;
  border: 2px solid var(--color-border);
}

.app-title {
  font-size: 56rpx;
  margin-bottom: 8rpx;
}

.app-subtitle {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
}

.stars {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 1;
}

.star {
  position: absolute;
  color: var(--color-accent);
  font-size: 40rpx;
  opacity: 0.6;
}

.star-1 { top: 15%; left: 20%; animation: twinkle 3s infinite alternate; }
.star-2 { top: 25%; right: 15%; animation: twinkle 4s infinite alternate; font-size: 50rpx; }
.star-3 { bottom: 30%; left: 10%; animation: twinkle 3.5s infinite alternate; font-size: 30rpx; }

@keyframes twinkle {
  0% { opacity: 0.3; transform: scale(0.8); }
  100% { opacity: 0.8; transform: scale(1.1); }
}

.entry-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.entry-prompt {
  font-size: 32rpx;
  color: var(--color-text-primary);
  margin-bottom: 40rpx;
}

.avatar-selectors {
  display: flex;
  gap: 60rpx;
  margin-bottom: 80rpx;
}

.avatar-option {
  width: 140rpx;
  height: 140rpx;
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;
  opacity: 0.7;
}

.avatar-option.selected {
  transform: scale(1.1);
  opacity: 1;
}

.golden-ring {
  position: absolute;
  top: -8rpx; left: -8rpx; right: -8rpx; bottom: -8rpx;
  border: 4px solid var(--color-accent);
  border-radius: 50%;
  box-shadow: 0 0 16rpx rgba(184, 148, 62, 0.4);
}

.start-btn {
  padding: 24rpx 80rpx;
  font-size: 32rpx;
  background-color: var(--color-accent);
  color: var(--color-bg-primary);
  border-radius: 40rpx;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.start-btn.disabled {
  opacity: 0.5;
  filter: grayscale(1);
  pointer-events: none;
}
</style>
