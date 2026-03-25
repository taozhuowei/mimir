<template>
  <view class="themes-page parchment-bg">
    <view class="top-bar">
      <view class="back-btn" @click="goBack"><text class="back-icon">←</text></view>
      <text class="page-title font-heading">塔罗主题</text>
      <view class="top-bar-right" />
    </view>

    <scroll-view scroll-y class="themes-content">
      <!-- 最新主题 -->
      <view class="theme-section">
        <view class="section-header">
          <text class="section-title font-heading">最新主题</text>
          <text class="filter-icon">≡</text>
        </view>
        <view class="theme-grid">
          <view v-for="theme in latestThemes" :key="theme.id" class="theme-card" @click="selectTheme(theme)">
            <view class="theme-preview" :style="{ backgroundColor: theme.previewColor }">
              <text v-if="theme.id === userStore.currentThemeId" class="current-badge">当前</text>
            </view>
            <text class="theme-name">{{ theme.name }}</text>
            <text class="theme-price">{{ theme.price === 0 ? '免费' : '¥' + theme.price }}</text>
          </view>
        </view>
      </view>

      <!-- 热门主题 -->
      <view class="theme-section">
        <view class="section-header">
          <text class="section-title font-heading">热门主题</text>
          <text class="filter-icon">≡</text>
        </view>
        <view class="theme-grid">
          <view v-for="theme in hotThemes" :key="theme.id" class="theme-card">
            <view class="theme-preview" :style="{ backgroundColor: theme.previewColor }" />
            <text class="theme-name">{{ theme.name }}</text>
            <text class="theme-price">¥{{ theme.price }}</text>
          </view>
        </view>
      </view>

      <!-- 全部主题 -->
      <view class="theme-section">
        <text class="section-title font-heading">全部主题</text>
        <view class="theme-grid">
          <view v-for="theme in allThemes" :key="theme.id" class="theme-card">
            <view class="theme-preview" :style="{ backgroundColor: theme.previewColor }" />
            <text class="theme-name">{{ theme.name }}</text>
            <text class="theme-price">{{ theme.price === 0 ? '免费' : '¥' + theme.price }}</text>
          </view>
        </view>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

interface ThemeItem {
  id: string
  name: string
  price: number
  previewColor: string
}

const latestThemes = ref<ThemeItem[]>([
  { id: 'golden_dawn', name: '黄金黎明', price: 0, previewColor: '#F5E6C8' },
  { id: 'midnight_blue', name: '午夜蓝调', price: 1, previewColor: '#1a1a3e' },
  { id: 'emerald_forest', name: '翡翠之森', price: 1, previewColor: '#1a3a2a' },
])

const hotThemes = ref<ThemeItem[]>([
  { id: 'golden_dawn', name: '黄金黎明', price: 0, previewColor: '#F5E6C8' },
  { id: 'rose_quartz', name: '玫瑰石英', price: 1, previewColor: '#f4c2c2' },
  { id: 'obsidian', name: '黑曜石', price: 1, previewColor: '#1a1a1a' },
])

const allThemes = ref<ThemeItem[]>([
  { id: 'golden_dawn', name: '黄金黎明', price: 0, previewColor: '#F5E6C8' },
  { id: 'midnight_blue', name: '午夜蓝调', price: 1, previewColor: '#1a1a3e' },
  { id: 'emerald_forest', name: '翡翠之森', price: 1, previewColor: '#1a3a2a' },
  { id: 'rose_quartz', name: '玫瑰石英', price: 1, previewColor: '#f4c2c2' },
  { id: 'obsidian', name: '黑曜石', price: 1, previewColor: '#1a1a1a' },
])

function selectTheme(theme: ThemeItem) {
  if (theme.id === 'golden_dawn') {
    userStore.switchTheme('golden_dawn')
    uni.showToast({ title: '已切换主题', icon: 'success' })
  } else {
    uni.showToast({ title: '主题暂未上架', icon: 'none' })
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.themes-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  padding-top: calc(env(safe-area-inset-top, 0px) + 20rpx);
}

.back-btn {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-border); border-radius: 50%;
}

.back-icon { font-size: 32rpx; color: var(--color-text-primary); }
.page-title { flex: 1; text-align: center; font-size: 32rpx; color: var(--color-text-primary); }
.top-bar-right { width: 64rpx; }

.themes-content { flex: 1; padding: 0 24rpx; }

.theme-section { margin-bottom: 48rpx; }

.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24rpx;
}

.section-title { font-size: 34rpx; color: var(--color-text-primary); }

.filter-icon {
  font-size: 32rpx; color: var(--color-text-secondary);
  padding: 8rpx;
}

.theme-grid {
  display: flex; flex-wrap: wrap; gap: 20rpx;
}

.theme-card {
  width: calc(50% - 10rpx);
  display: flex; flex-direction: column;
}

.theme-preview {
  width: 100%; height: 260rpx;
  border-radius: 12rpx;
  border: 1px solid var(--color-border);
  position: relative;
}

.current-badge {
  position: absolute; top: 12rpx; right: 12rpx;
  background: var(--color-accent); color: var(--color-bg-primary);
  font-size: 20rpx; padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.theme-name {
  font-size: 26rpx; color: var(--color-text-primary);
  margin-top: 12rpx;
}

.theme-price {
  font-size: 22rpx; color: var(--color-text-secondary);
}
</style>
