<template>
  <view class="divination-overlay" ref="overlayRef">
    <!-- 毛玻璃背景 -->
    <view class="overlay-bg glass" ref="overlayBgRef" />

    <!-- 进度指示区 -->
    <view class="progress-header" ref="headerRef">
      <view class="stars">
        <image class="star" :class="{ active: isS1Active, blink: isS1Blink }" 
               :src="isS1Active ? '/static/themes/golden_dawn/ui/star_active.svg' : '/static/themes/golden_dawn/ui/star_inactive.svg'" />
        <view class="star-line" />
        <image class="star" :class="{ active: isS2Active, blink: isS2Blink }" 
               :src="isS2Active ? '/static/themes/golden_dawn/ui/star_active.svg' : '/static/themes/golden_dawn/ui/star_inactive.svg'" />
        <view class="star-line" />
        <image class="star" :class="{ active: isS3Active, blink: isS3Blink }" 
               :src="isS3Active ? '/static/themes/golden_dawn/ui/star_active.svg' : '/static/themes/golden_dawn/ui/star_inactive.svg'" />
      </view>
      <text class="phase-prompt font-heading">{{ phasePrompt }}</text>
    </view>

    <!-- 主舞台 -->
    <view class="stage" ref="stageRef">
      <!-- 带有厚度层叠感的多张牌（洗牌用） -->
      <view class="deck-layer">
        <!-- 初始牌堆 / 聚拢牌堆 (12 张) -->
        <image v-for="i in 12" :key="'m'+i" 
               class="tarot-card stack-card initial-deck" 
               :ref="el => setRef(el, initialDeckRefs, i-1)" 
               :src="cardBack" 
               :style="{ transform: `translateY(${-i * 1.2}px)` }" />

        <!-- 洗牌左分堆 (6张) -->
        <image v-for="i in 6" :key="'l'+i" class="tarot-card stack-card hidden-element" :ref="el => setRef(el, leftDeckRefs, i-1)" :src="cardBack" />
        <!-- 洗牌右分堆 (6张) -->
        <image v-for="i in 6" :key="'r'+i" class="tarot-card stack-card hidden-element" :ref="el => setRef(el, rightDeckRefs, i-1)" :src="cardBack" />
      </view>

      <!-- 切牌用的三个叠层分身 (分别代表三大叠) -->
      <image class="tarot-card hidden-element stage-center cut-t" ref="cutTopRef" :src="cardBack" />
      <image class="tarot-card hidden-element stage-center cut-m" ref="cutMidRef" :src="cardBack" />
      <image class="tarot-card hidden-element stage-center cut-b" ref="cutBotRef" :src="cardBack" />

      <!-- 最终抽取的 3 张牌 -->
      <view class="draw-container" ref="drawStageRef">
        <view class="draw-wrapper hidden-element stage-center" v-for="(idx) in [0, 1, 2]" :key="idx" :ref="el => setRef(el, drawRefs, idx)">
          <view class="card-3d-inner" :ref="el => setRef(el, innerRefs, idx)">
            <image class="tarot-card face-back" :src="cardBack" />
            <view class="tarot-card face-front">
               <image class="front-img" :src="getCardImg(idx)" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="action-footer" ref="footerRef">
      <view class="actions">
        <template v-if="phase === 'shuffling'">
          <view v-if="!actionDone" class="btn btn-primary" @click="playShuffle">开始洗牌</view>
          <template v-else>
            <view class="btn" @click="playShuffle">再洗一次</view>
            <view class="btn btn-primary" @click="playCut">开始切牌</view>
          </template>
        </template>
        
        <template v-if="phase === 'cutting'">
          <template v-if="actionDone">
            <view class="btn" @click="playCut">再切一次</view>
            <view class="btn btn-primary" @click="playDraw">抽取牌阵</view>
          </template>
        </template>
        
        <template v-if="phase === 'drawing'">
          <!-- 抽牌动作在执行中，不显示按钮，或等待执行完显示查看按钮 -->
        </template>
        
        <template v-if="phase === 'revealing'">
          <view class="btn btn-primary reveal-btn" @click="finish">查看神谕</view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import gsap from 'gsap'
import { useTarotStore } from '../stores/tarot'
import { useUserStore } from '../stores/user'

const emit = defineEmits(['complete'])
const tarotStore = useTarotStore()
const userStore = useUserStore()

const cardBack = computed(() => userStore.cardBackImage || '/static/themes/golden_dawn/tarot/card_back.jpeg')

const phase = ref<'shuffling'|'cutting'|'drawing'|'revealing'>('shuffling')
const actionDone = ref(false)
const phasePrompt = ref('流程：请洗牌')

// 进度星光逻辑
const isS1Active = computed(() => ['shuffling','cutting','drawing','revealing'].includes(phase.value))
const isS2Active = computed(() => ['cutting','drawing','revealing'].includes(phase.value))
const isS3Active = computed(() => ['drawing','revealing'].includes(phase.value))

const isS1Blink = computed(() => phase.value === 'shuffling')
const isS2Blink = computed(() => phase.value === 'cutting')
const isS3Blink = computed(() => phase.value === 'drawing')

// 自适应屏幕方向逻辑
const isWide = ref(false)
function checkWidth() {
  isWide.value = window.innerWidth >= 768
}

onMounted(() => {
  checkWidth()
  window.addEventListener('resize', checkWidth)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkWidth)
})

// === DOM Refs ===
const overlayRef = ref<any>(null)
const overlayBgRef = ref<any>(null)
const stageRef = ref<any>(null)
const headerRef = ref<any>(null)
const footerRef = ref<any>(null)

const initialDeckRefs = ref<any[]>([])
const leftDeckRefs = ref<any[]>([])
const rightDeckRefs = ref<any[]>([])
const cutTopRef = ref<any>(null)
const cutMidRef = ref<any>(null)
const cutBotRef = ref<any>(null)

const drawStageRef = ref<any>(null)
const drawRefs = ref<any[]>([])
const innerRefs = ref<any[]>([])

function setRef(el: any, arr: any[], index: number) {
  if (el) arr[index] = el
}

function el(r: any) { return (r && r.$el) ? r.$el : r }
function elArr(arr: any[]) { return arr.map(a => el(a)) }

function getCardImg(idx: number) {
  return tarotStore.drawnCards[idx]?.card.image || cardBack.value
}

onMounted(() => {
  nextTick(() => {
    const cardEl = elArr(initialDeckRefs.value)[0]
    const entryDrop = cardEl ? cardEl.offsetHeight * 4 : 600
    
    // 强制初始化舞台中央独立卡牌的锚点，防止与洗牌中的嵌套卡牌冲突
    gsap.set('.stage-center', { xPercent: -50, yPercent: -50 });

    // 初始入场动画
    gsap.fromTo(el(overlayBgRef.value), { backdropFilter: 'blur(0px)', opacity: 0 }, { backdropFilter: 'blur(20px)', opacity: 1, duration: 1 })
    gsap.fromTo(elArr(initialDeckRefs.value), { y: -entryDrop, rotation: 180, scale: 0.5 }, { y: (i) => -i*1.2, rotation: 0, scale: 1, duration: 1.2, ease: 'back.out(1.4)', stagger: 0.02 })
    gsap.fromTo([el(headerRef.value), el(footerRef.value)], { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.8, ease: 'power2.out' })
  })
})

// Helper: get actual rendered card width
function getCardW() {
  const c = elArr(initialDeckRefs.value)[0]
  return c ? c.offsetWidth : 100
}
function getCardH() {
  const c = elArr(initialDeckRefs.value)[0]
  return c ? c.offsetHeight : 160
}

// ==========================================
// 1. 完全拟真完美洗牌 (Riffle Shuffle - 层叠互插版)
// ==========================================
function playShuffle() {
  actionDone.value = false
  phasePrompt.value = '流程：洗牌中'
  
  const initCards = elArr(initialDeckRefs.value)
  const lCards = elArr(leftDeckRefs.value)
  const rCards = elArr(rightDeckRefs.value)
  const cw = getCardW()

  const tl = gsap.timeline({ onComplete: () => {
    actionDone.value = true
    phasePrompt.value = '流程：请切牌'
  }})

  // 隐藏初始牌，显示分离牌堆
  tl.set(initCards, { autoAlpha: 0 })
    .set(lCards, { display: 'block', autoAlpha: 1, x: 0, y: (i) => -i*2.4, rotation: 0 })
    .set(rCards, { display: 'block', autoAlpha: 1, x: 0, y: (i) => -i*2.4, rotation: 0 })
    
  // 左右扒开 — 偏移量 = 卡宽 * 0.7
  const spreadX = cw * 0.7
  tl.to(lCards, { x: -spreadX, y: -20, rotation: -12, duration: 0.4, ease: 'power2.out' })
    .to(rCards, { x: spreadX, y: 20, rotation: 12, duration: 0.4, ease: 'power2.out' }, '<')
    
  // 模拟弯曲与交错落下 (Stagger 交替)
  tl.to(lCards, { x: 0, y: (i) => -i*2.4, rotation: -2, duration: 0.3, stagger: 0.05, ease: 'power1.in' }, '+=0.1')
  tl.to(rCards, { x: 0, y: (i) => -i*2.4 - 1.2, rotation: 2, duration: 0.3, stagger: 0.05, ease: 'power1.in' }, '<0.02')

  // 挤压复原
  tl.to([...lCards, ...rCards], { x: 0, rotation: 0, duration: 0.2, ease: 'back.out(2)' })
    .set([...lCards, ...rCards], { autoAlpha: 0 })
    .set(initCards, { autoAlpha: 1 })
    // 厚度弹压震动
    .fromTo(initCards, { scaleY: 0.9 }, { scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
}

function playCut() {
  // 直接进入切牌期
  phase.value = 'cutting'
  tarotStore.setPhase('cutting')
  
  actionDone.value = false
  phasePrompt.value = '流程：切牌中'
  const initCards = elArr(initialDeckRefs.value)
  const cT = el(cutTopRef.value)
  const cM = el(cutMidRef.value)
  const cB = el(cutBotRef.value)

  // 判断阵型坐标 — 基于卡牌实际宽高
  const cw = getCardW()
  const ch = getCardH()
  const spread = isWide.value ? cw * 1.2 : ch * 0.9
  const ax = isWide.value ? -spread : 0
  const ay = isWide.value ? 0 : -spread
  
  const cx = isWide.value ? spread : 0
  const cy = isWide.value ? 0 : spread

  const tl = gsap.timeline({ onComplete: () => {
    actionDone.value = true
    phasePrompt.value = '流程：请抽取牌阵'
  }})

  tl.set([cT, cM, cB], { display: 'block', autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1, zIndex: 10 })
    .to(initCards, { autoAlpha: 0, duration: 0.1 })
    // 一分为三
    .to(cT, { x: ax, y: ay, rotation: -4, duration: 0.6, ease: 'power3.out' }, '<')
    .to(cM, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'power3.out' }, '<')
    .to(cB, { x: cx, y: cy, rotation: 4, duration: 0.6, ease: 'power3.out' }, '<')
    // Z轴抬升
    .to([cT, cM, cB], { scale: 1.1, boxShadow: '0 20px 30px rgba(0,0,0,0.4)', duration: 0.4, ease: 'power1.out' })
    // 交换位置
    .to(cT, { x: cx, y: cy, rotation: 2, duration: 0.8, ease: 'back.inOut(1.2)', zIndex: 12 }, '+=0.1')
    .to(cB, { x: ax, y: ay, rotation: -2, duration: 0.8, ease: 'back.inOut(1.2)' }, '<')
    // 聚拢
    .to([cT, cM, cB], { x: 0, y: 0, rotation: 0, scale: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.2)', duration: 0.5, stagger: 0.1, ease: 'power3.out' })
    .set([cT, cM, cB], { autoAlpha: 0 })
    .to(initCards, { autoAlpha: 1, duration: 0.1 })
}

// ==========================================
// 3. 抽牌与 Z 轴翻转揭示
// ==========================================
function playDraw() {
  phase.value = 'drawing'
  tarotStore.setPhase('drawing')
  tarotStore.drawThreeCards()
  
  actionDone.value = false
  phasePrompt.value = '流程：牌阵凝聚中'
  
  const initCards = elArr(initialDeckRefs.value)
  const stage = el(stageRef.value)
  const wrappers = elArr(drawRefs.value)
  const deckContainer = initCards[0]?.parentElement

  // 获取舞台实际渲染尺寸
  const stageRect = stage.getBoundingClientRect()
  const stageW = stageRect.width
  const stageH = stageRect.height
  const cw = getCardW()
  const ch = getCardH()

  const tl = gsap.timeline()
  
  // 0. 准备阶段：牌堆轻微抖动预警
  tl.to(deckContainer, { x: "+=4", yoyo: true, repeat: 10, duration: 0.05 })
    .to(deckContainer, { x: 0, duration: 0.1 })

  // 1. 镜头下沉感 — 相对于舞台高度的30%
  const liftY = stageH * 0.35
  tl.to(stage, { y: -liftY, duration: 1.8, ease: 'power2.inOut' }, '+=0.2')
    .to(initCards, { autoAlpha: 0, y: -ch * 0.4, scale: 0.8, duration: 0.6, ease: 'power1.in' }, '<0.2')

  // 2. 计算阵型排布 — 基于舞台实际尺寸
  const gap = cw * 0.3 // 卡牌间距
  const targetX = isWide.value ? [-(cw + gap), 0, (cw + gap)] : [0, 0, 0]
  const targetY = isWide.value
    ? [liftY + stageH * 0.1, liftY + stageH * 0.1, liftY + stageH * 0.1]
    : [liftY + ch * 1.8, liftY + ch * 0.8, liftY - ch * 0.2]

  // 3. 溺水发牌
  wrappers.forEach((card, i) => {
    const cardTl = gsap.timeline()
    cardTl.set(card, { display: 'block', autoAlpha: 1, x: 0, y: i === 0 ? -ch * 0.3 : -stageH, rotation: (Math.random() - 0.5) * 15, scale: 1, zIndex: 10 + i })
      // 下沉穿过
      .to(card, { x: targetX[i], y: targetY[i] + ch * 0.4, duration: 0.7, ease: 'power2.in' })
      // 减速阻力
      .to(card, { y: targetY[i] + ch * 0.6, duration: 0.4, ease: 'power1.out' })
      // 上浮靠泊
      .to(card, { y: targetY[i], duration: 1.5, ease: 'power3.out' })
      // 微缩呼吸律动
      .to(card, { y: targetY[i] - 5, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }, '-=0.5')
    
    tl.add(cardTl, 1.0 + i * 0.9)
  })

  // 4. 强制阵型校准与 Z 轴放置桌面动画
  const alignTime = 6.0;
  
  tl.add(() => { gsap.killTweensOf(wrappers, "y") }, alignTime)
  
  tl.to(wrappers, { 
    x: (i) => targetX[i], 
    y: (i) => targetY[i] - ch * 0.3,
    rotation: 0, 
    duration: 0.8, 
    ease: 'power3.inOut' 
  }, alignTime + 0.1)

  // Z轴平推
  tl.to(wrappers, {
    scale: 0.9,
    boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
    duration: 0.5,
    ease: 'power1.out'
  }, alignTime + 0.9)

  // 5. 依次翻牌揭晓
  const inners = elArr(innerRefs.value)
  tl.to(inners, {
    rotationY: 180,
    duration: 1.0,
    stagger: 0.4,
    ease: 'back.out(1.1)'
  }, alignTime + 1.2)

  // 结束阶段
  tl.add(() => {
    phase.value = 'revealing'
    tarotStore.setPhase('revealing')
    phasePrompt.value = '流程：神谕已现'
    actionDone.value = true
  }, alignTime + 3.0)

  // 自动返回聊天界面
  tl.add(() => {
    finish()
  }, alignTime + 5.5)
}

function finish() {
  const overlay = el(overlayRef.value)
  gsap.to(overlay, {
    opacity: 0, scale: 1.1, duration: 0.6, ease: 'power2.inOut',
    onComplete: () => {
      tarotStore.endDivination()
      emit('complete')
    }
  })
}
</script>

<style scoped>
.divination-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.overlay-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: -1;
}

/* 顶部进度区 */
.progress-header {
  margin-top: calc(env(safe-area-inset-top, 0px) + 60rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 20;
}

.stars {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.star {
  width: 48rpx;
  height: 48rpx;
  transition: all 0.5s ease;
}

.star.active {
  transform: scale(1.2);
  filter: drop-shadow(0 0 4px rgba(212, 184, 114, 0.4));
}

.star.blink {
  animation: starBlink 1s infinite alternate;
}

@keyframes starBlink {
  0% { opacity: 0.6; filter: drop-shadow(0 0 2px rgba(212, 184, 114, 0.2)); transform: scale(1.1); }
  100% { opacity: 1; filter: drop-shadow(0 0 12px rgba(212, 184, 114, 1)); transform: scale(1.3); }
}

.star-line {
  width: 60rpx;
  height: 2px;
  background: var(--color-divider);
}

.phase-prompt {
  font-size: 28rpx;
  color: var(--color-text-primary);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  letter-spacing: 0.05em;
}

/* 舞台容器 */
.stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
}

.tarot-card {
  width: 26vw;
  height: 41.6vw;
  border-radius: 12rpx;
  border: 1px solid var(--color-border);
  will-change: transform;
}

.deck-layer {
  position: relative;
  width: 26vw;
  height: 41.6vw;
}

.stack-card { 
  position: absolute; 
  top: 0; left: 0; 
  box-shadow: none; /* 默认无阴影，避免层叠过重 */
}

/* 只有最底下一张有重阴影，制造出整体悬浮感 */
.stack-card:first-child {
  box-shadow: 0 12px 30px rgba(0,0,0,0.5);
}

/* 其他辅助单卡保留单独阴影 */
.cut-t, .cut-m, .cut-b, .draw-wrapper {
  box-shadow: 0 8px 24rpx rgba(0,0,0,0.3);
}

/* 悬浮于自由舞台中央的元素 */
.stage-center {
  position: absolute;
  top: 50%; left: 50%;
}

.hidden-element {
  /* 仅负责初始不可见 */
  display: none;
  opacity: 0;
}

/* 抽卡容器 */
.draw-container {
  position: absolute;
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.draw-wrapper {
  perspective: 1200px;
  position: absolute;
}

.card-3d-inner {
  width: 26vw;
  height: 41.6vw;
  transform-style: preserve-3d;
  position: relative;
}

@media (min-width: 768px) {
  .tarot-card, .deck-layer, .card-3d-inner {
    width: 13vw;
    height: 20.8vw;
  }
}

.face-back, .face-front {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  backface-visibility: hidden;
  margin: 0 !important;
}

.face-front {
  transform: rotateY(180deg);
  background: var(--color-card-bg);
}

.front-img {
  width: 100%; height: 100%;
  border-radius: 12rpx;
  object-fit: cover;
}

/* 底部交互区 */
.action-footer {
  padding: 40rpx 20rpx calc(env(safe-area-inset-bottom, 0px) + 60rpx);
  display: flex;
  justify-content: center;
  z-index: 20;
}

.actions { display: flex; gap: 30rpx; }
.btn {
  padding: 18rpx 40rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.btn-primary {
  background-image: url('/static/themes/golden_dawn/ui/btn_primary.svg');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  color: #cca957;
  border: none;
  font-weight: bold;
}
.reveal-btn { padding-left: 80rpx; padding-right: 80rpx; animation: pulse 2s infinite; }

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(204, 169, 87, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(204, 169, 87, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(204, 169, 87, 0); }
}
</style>
