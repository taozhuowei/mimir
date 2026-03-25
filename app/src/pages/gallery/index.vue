<template>
  <view class="gallery-page parchment-bg">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="page-title font-heading">塔罗图鉴</text>
      <view class="top-bar-right" />
    </view>

    <!-- 画廊区域 -->
    <view class="gallery-container">
      <!-- 三列卡牌展示 -->
      <view class="cards-gallery" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <!-- 左侧卡牌（虚化） -->
        <view class="gallery-card side-card left-card" @click="prevCard">
          <image
            :src="prevCardInfo.image"
            class="gallery-card-img"
            mode="aspectFit"
          />
          <text class="card-title">{{ prevCardInfo.nameEn }}</text>
          <text class="card-number">{{ prevCardInfo.number }}</text>
        </view>

        <!-- 中心卡牌（高亮） -->
        <view class="gallery-card center-card">
          <image
            :src="currentCardInfo.image"
            class="gallery-card-img"
            mode="aspectFit"
          />
          <text class="card-title">{{ currentCardInfo.nameEn }}</text>
          <text class="card-number">{{ currentCardInfo.number }}</text>
        </view>

        <!-- 右侧卡牌（虚化） -->
        <view class="gallery-card side-card right-card" @click="nextCard">
          <image
            :src="nextCardInfo.image"
            class="gallery-card-img"
            mode="aspectFit"
          />
          <text class="card-title">{{ nextCardInfo.nameEn }}</text>
          <text class="card-number">{{ nextCardInfo.number }}</text>
        </view>
      </view>

      <!-- 信息卡片 -->
      <view class="info-card card">
        <text class="info-label">含义解读</text>
        <text class="info-title font-heading">{{ currentCardInfo.meaningTitle }}</text>
        <text class="info-desc">{{ currentCardInfo.meaningUpright }}</text>
        <text class="info-desc reversed">逆位时，{{ currentCardInfo.meaningReversed }}</text>

        <view class="info-actions">
          <view class="btn" @click="showMore">查看更多</view>
          <view class="share-btn" @click="share">
            <text>↗</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Mock 数据 - 大阿卡纳
const cards = ref([
  { id: 'major_00', name: '愚者', nameEn: 'THE FOOL', number: '0', image: '/static/themes/golden_dawn/tarot/major/major_arcana_00_the_fool.jpeg', meaningTitle: '冒险与自由', meaningUpright: '愚者代表新的开始、冒险精神和无限的可能性。它鼓励你勇敢地踏出舒适区，拥抱未知。', meaningReversed: '可能意味着鲁莽行事、缺乏计划，或对未知的恐惧阻碍了你前进的脚步。' },
  { id: 'major_01', name: '魔术师', nameEn: 'THE MAGICIAN', number: 'I', image: '/static/themes/golden_dawn/tarot/major/major_arcana_01_the_magician.jpeg', meaningTitle: '意志与创造', meaningUpright: '魔术师象征着你拥有实现目标所需的一切工具和能力。专注于你的意图，将想法转化为现实。', meaningReversed: '可能暗示操控、欺骗或才能的浪费，提醒你审视自己的动机。' },
  { id: 'major_02', name: '女祭司', nameEn: 'THE HIGH PRIESTESS', number: 'II', image: '/static/themes/golden_dawn/tarot/major/major_arcana_02_the_high_priestess.jpeg', meaningTitle: '直觉与神秘', meaningUpright: '女祭司提醒你信任直觉，倾听内心深处的声音。她代表隐藏的知识和潜意识的智慧。', meaningReversed: '可能暗示忽视直觉、表面化思考或秘密即将被揭露。' },
  { id: 'major_03', name: '女皇', nameEn: 'THE EMPRESS', number: 'III', image: '/static/themes/golden_dawn/tarot/major/major_arcana_03_the_empress.jpeg', meaningTitle: '丰收与滋养', meaningUpright: '女皇象征丰饶、母性的关怀和创造力。她带来温暖、舒适和自然的美好。', meaningReversed: '可能暗示过度依赖、创造力受阻或忽视自我照顾。' },
  { id: 'major_04', name: '皇帝', nameEn: 'THE EMPEROR', number: 'IV', image: '/static/themes/golden_dawn/tarot/major/major_arcana_04_the_emperor.jpeg', meaningTitle: '权威与秩序', meaningUpright: '皇帝代表结构、稳定和领导力。他鼓励你建立秩序，承担责任。', meaningReversed: '可能暗示过于专制、僵化或失去控制。' },
])

const currentIndex = ref(0)
let touchStartX = 0

const currentCardInfo = computed(() => cards.value[currentIndex.value])
const prevCardInfo = computed(() => {
  const idx = (currentIndex.value - 1 + cards.value.length) % cards.value.length
  return cards.value[idx]
})
const nextCardInfo = computed(() => {
  const idx = (currentIndex.value + 1) % cards.value.length
  return cards.value[idx]
})

function prevCard() {
  currentIndex.value = (currentIndex.value - 1 + cards.value.length) % cards.value.length
}

function nextCard() {
  currentIndex.value = (currentIndex.value + 1) % cards.value.length
}

function onTouchStart(e: any) {
  touchStartX = e.touches[0].clientX
}

function onTouchEnd(e: any) {
  const diff = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(diff) > 50) {
    diff > 0 ? prevCard() : nextCard()
  }
}

function goBack() {
  uni.navigateBack()
}

function showMore() {
  uni.showToast({ title: '更多信息', icon: 'none' })
}

function share() {
  uni.showToast({ title: '分享功能', icon: 'none' })
}
</script>

<style scoped>
.gallery-page {
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
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 50%;
}

.back-icon {
  font-size: 32rpx;
  color: var(--color-text-primary);
}

.page-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  color: var(--color-text-primary);
}

.top-bar-right { width: 64rpx; }

.gallery-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20rpx;
}

.cards-gallery {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 40rpx 0;
}

.gallery-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
}

.side-card {
  opacity: 0.5;
  filter: blur(2px);
  transform: scale(0.85);
}

.center-card {
  transform: scale(1);
  z-index: 2;
}

.gallery-card-img {
  width: min(200rpx, 140px);
  height: min(320rpx, 224px);
  border-radius: 12rpx;
  border: 2px solid var(--color-border);
  background: var(--color-card-bg);
}

.center-card .gallery-card-img {
  width: min(260rpx, 180px);
  height: min(400rpx, 280px);
  border-color: var(--color-accent);
}

.card-title {
  font-size: 22rpx;
  color: var(--color-text-primary);
  margin-top: 12rpx;
  font-family: var(--font-heading);
  letter-spacing: 0.05em;
}

.card-number {
  font-size: 20rpx;
  color: var(--color-text-secondary);
}

.info-card {
  margin-top: 32rpx;
}

.info-label {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-bottom: 8rpx;
}

.info-title {
  font-size: 36rpx;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
}

.info-desc {
  font-size: 26rpx;
  color: var(--color-text-primary);
  line-height: 1.8;
  margin-bottom: 12rpx;
}

.info-desc.reversed {
  color: var(--color-text-secondary);
}

.info-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
}

.info-actions .btn {
  flex: 1;
}

.share-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  font-size: 32rpx;
}
</style>
