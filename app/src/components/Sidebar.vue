<template>
  <!-- 遮罩层 -->
  <view v-if="visible" class="sidebar-mask" @click="close" />

  <!-- 侧边栏 -->
  <view class="sidebar" :class="{ open: visible }">
    <!-- 头像与新建按钮 -->
    <view class="sidebar-header">
      <view class="sidebar-avatar rounded-full-crop">
        <image
          class="avatar-img"
          :src="userStore.avatar || '/static/icons/user_avatar_male.png'"
          mode="aspectFill"
        />
      </view>
      
      <view class="new-chat-btn btn border-brass wax-gloss" @click="newChat">
        <image class="btn-icon" src="/static/icons/new_divination_icon.svg" mode="aspectFit" />
        <text>新的占卜</text>
      </view>
    </view>

    <!-- 对话记录 -->
    <view class="sidebar-section">
      <text class="section-label">对话记录</text>
      <view class="history-card">
        <view
          v-for="session in chatStore.sessions"
          :key="session.id"
          class="history-item"
          @click="openSession(session.id)"
        >
          <text class="history-title">{{ session.title }}</text>
        </view>
        <view v-if="chatStore.sessions.length === 0" class="empty-hint">
          <text>暂无记录</text>
        </view>
      </view>
    </view>

    <!-- 导航项 -->
    <view class="sidebar-nav">
      <view class="nav-item" @click="navTo('/pages/themes/index')">
         <image class="nav-icon" src="/static/icons/new_divination_icon.svg" mode="aspectFit" />
        <text class="nav-text">塔罗皮肤</text>
      </view>
      <view class="nav-item" @click="navTo('/pages/gallery/index')">
        <image class="nav-icon" src="/static/icons/new_divination_icon.svg" mode="aspectFit" />
        <text class="nav-text">塔罗图鉴</text>
      </view>
    </view>

    <!-- 底部设置 -->
    <view class="sidebar-footer" @click="navTo('/pages/settings/index')">
      <image class="nav-icon" src="/static/icons/new_divination_icon.svg" mode="aspectFit" />
      <text class="nav-text">设置</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '../stores/user'
import { useChatStore } from '../stores/chat'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible'])

const userStore = useUserStore()
const chatStore = useChatStore()

function close() {
  emit('update:visible', false)
}

function openSession(id: string) {
  chatStore.switchSession(id)
  close()
}

function newChat() {
  chatStore.createSession()
  close()
}

function navTo(url: string) {
  close()
  uni.navigateTo({ url })
}
</script>

<style scoped>
.sidebar-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 70%;
  max-width: 560rpx;
  background: var(--color-sidebar-bg);
  z-index: 101;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  padding: 0 24rpx;
  padding-top: calc(env(safe-area-inset-top, 0px) + 40rpx);
}

.sidebar.open {
  transform: translateX(0);
}

/* 宽屏下的常驻侧边栏 */
@media (min-width: 768px) {
  .sidebar-mask {
    display: none !important;
  }
  .sidebar {
    position: relative;
    transform: translateX(0) !important;
    width: 100%;
    max-width: 100%;
    border-right: none;
    z-index: 10;
  }
}

.sidebar-header {
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  border-radius: 32rpx;
  background: linear-gradient(145deg, var(--color-bg-secondary), var(--color-bg-primary));
  cursor: pointer;
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 22rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.sidebar-avatar {
  width: 60rpx;
  height: 60rpx;
  flex-shrink: 0;
  border: 2px solid var(--color-accent);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.sidebar-section {
  margin-bottom: 40rpx;
}

.section-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 16rpx;
}

.history-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 16rpx;
}

.history-item {
  padding: 16rpx 0;
  border-bottom: 1px solid var(--color-divider);
  cursor: pointer;
}

.history-item:last-child {
  border-bottom: none;
}

.history-title {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.empty-hint {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 24rpx;
  padding: 20rpx 0;
}

.sidebar-nav {
  margin-bottom: 40rpx;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid var(--color-divider);
  cursor: pointer;
}

.nav-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.nav-text {
  font-size: 30rpx;
  color: var(--color-text-primary);
  font-weight: bold;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  padding: 32rpx 0;
  border-top: 1px solid var(--color-divider);
  cursor: pointer;
  margin-top: auto;
}
</style>
