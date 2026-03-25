<template>
  <view class="settings-page parchment-bg">
    <view class="top-bar">
      <view class="back-btn" @click="goBack"><text class="back-icon">←</text></view>
      <text class="page-title font-heading">设置</text>
      <view class="top-bar-right" />
    </view>

    <scroll-view scroll-y class="settings-content">
      <!-- 个人账户 -->
      <text class="group-label">个人账户</text>
      <view class="settings-group">
        <view class="setting-item" @click="nav('account')">
          <text class="setting-icon">👤</text>
          <text class="setting-text">账户设置</text>
          <text class="setting-arrow">›</text>
        </view>
        <view class="divider" />
        <view class="setting-item" @click="nav('security')">
          <text class="setting-icon">🛡️</text>
          <text class="setting-text">安全设置</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>

      <!-- 应用偏好 -->
      <text class="group-label">应用偏好</text>
      <view class="settings-group">
        <view class="setting-item" @click="nav('notifications')">
          <text class="setting-icon">🔔</text>
          <text class="setting-text">通知设置</text>
          <text class="setting-arrow">›</text>
        </view>
        <view class="divider" />
        <view class="setting-item" @click="nav('general')">
          <text class="setting-icon">⚙️</text>
          <text class="setting-text">通用设置</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>

      <!-- 关于 -->
      <text class="group-label">关于</text>
      <view class="settings-group">
        <view class="setting-item" @click="nav('help')">
          <text class="setting-icon">❓</text>
          <text class="setting-text">帮助中心</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-section">
        <view class="logout-btn" @click="logout">
          <text class="logout-text">退出登录</text>
        </view>
        <text class="version-text">VERSION 1.0.0 (AI TAROT)</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
function goBack() { uni.navigateBack() }

function nav(section: string) {
  uni.showToast({ title: section + ' 功能开发中', icon: 'none' })
}

function logout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.redirectTo({ url: '/pages/splash/index' })
      }
    }
  })
}
</script>

<style scoped>
.settings-page {
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

.settings-content {
  flex: 1;
  padding: 0 24rpx;
}

.group-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin: 32rpx 0 16rpx 8rpx;
}

.settings-group {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 16rpx;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  gap: 20rpx;
}

.setting-icon { font-size: 36rpx; }

.setting-text {
  flex: 1;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.setting-arrow {
  font-size: 36rpx;
  color: var(--color-text-secondary);
}

.logout-section {
  margin-top: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 60rpx;
}

.logout-btn {
  padding: 20rpx 80rpx;
}

.logout-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  letter-spacing: 0.2em;
}

.version-text {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 24rpx;
  opacity: 0.6;
  letter-spacing: 0.1em;
}
</style>
