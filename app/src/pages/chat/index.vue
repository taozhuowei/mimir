<template>
  <view class="chat-page parchment-bg layout-wrapper kraft-noise">
    <!-- 左栏: 侧边栏 (宽屏常驻, 移动端隐藏) -->
    <view class="left-col">
      <Sidebar v-model:visible="sidebarOpen" />
    </view>

    <!-- 中栏: 主聊天核心区 -->
    <view class="main-content middle-col">
      <!-- 顶部栏 -->
      <view class="top-bar border-brass wax-gloss">
        <!-- 头像仅在手机端显示触发器？PRD说移动端隐藏侧边栏 -->
        <view class="user-avatar rounded-full-crop border-brass" @click="sidebarOpen = true">
          <image
            class="avatar-img"
            :src="userStore.avatar || '/static/icons/user_avatar_male.png'"
            mode="aspectFill"
          />
        </view>
        <text class="page-title font-heading brass-text">AI Tarot</text>
        <view class="top-bar-right" />
      </view>

      <!-- 消息列表 -->
      <scroll-view
        class="message-list"
        scroll-y
        :scroll-into-view="scrollToId"
        scroll-with-animation
      >
      <!-- 欢迎消息 -->
      <view v-if="chatStore.currentMessages.length === 0" class="welcome-msg">
        <view class="crystal-ball-wrapper wax-gloss border-brass">
          <CrystalBall :animate="false" />
        </view>
        <text class="welcome-text font-heading brass-text">遵循宇宙的指引</text>
        <text class="welcome-sub">告诉我你的疑问，让塔罗牌为你指引方向</text>
      </view>

      <!-- 消息气泡 -->
      <view
        v-for="msg in chatStore.currentMessages"
        :key="msg.id"
        :id="'msg-' + msg.id"
        class="message-wrapper"
        :class="{ 'message-user': msg.role === 'user', 'message-ai': msg.role === 'ai' }"
      >
        <!-- AI 头像 -->
        <view v-if="msg.role === 'ai'" class="msg-avatar rounded-full-crop border-brass wax-gloss">
          <image
            class="avatar-img"
            src="/static/icons/app_ai_chat_avatar.png"
            mode="aspectFill"
          />
        </view>

        <view class="bubble wax-gloss" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
          <!-- 占卜结果卡牌展示 -->
          <view v-if="msg.cards && msg.cards.length" class="cards-row">
            <view v-for="(card, idx) in msg.cards" :key="idx" class="card-mini-container">
              <view class="card-mini-inner" :style="{ animationDelay: `${idx * 0.3 + 1.0}s` }">
                <view class="card-mini-face card-mini-back border-brass">
                  <image class="card-mini-img" :src="userStore.cardBackImage || '/static/themes/golden_dawn/tarot/card_back.jpeg'" mode="aspectFit" />
                </view>
                <view class="card-mini-face card-mini-front border-brass">
                  <image class="card-mini-img" :src="card.image" mode="aspectFit" />
                  <text class="card-mini-name">{{ card.name }}</text>
                  <text class="card-mini-pos">{{ card.position === 'upright' ? '正位' : '逆位' }}</text>
                </view>
              </view>
            </view>
            <text v-if="msg.isStreaming" class="reading-hint brass-text">占卜家解读中...</text>
          </view>

          <!-- 消息文本 -->
          <text class="bubble-text">{{ msg.content }}</text>
          <text v-if="msg.isStreaming && !msg.cards" class="cursor-blink">|</text>
        </view>

        <!-- 用户头像 -->
        <view v-if="msg.role === 'user'" class="msg-avatar rounded-full-crop border-brass wax-gloss">
          <image
            class="avatar-img"
            :src="userStore.avatar"
            mode="aspectFill"
          />
        </view>
      </view>

      <!-- AI 思考中 -->
      <view v-if="chatStore.isAiThinking" class="message-wrapper message-ai">
        <view class="msg-avatar rounded-full-crop border-brass wax-gloss">
          <image class="avatar-img" src="/static/icons/app_ai_chat_avatar.png" mode="aspectFill" />
        </view>
        <view class="bubble bubble-ai thinking-bubble wax-gloss">
          <CrystalBall :animate="true" :size="60" />
        </view>
      </view>

      <view style="height: 200rpx;" />
    </scroll-view>

    <!-- 快捷回复 -->
    <view v-if="chatStore.quickReplies.length" class="quick-replies" ref="quickRepliesRef">
      <scroll-view scroll-x class="quick-scroll">
        <view
          v-for="(reply, idx) in chatStore.quickReplies"
          :key="idx"
          class="quick-btn border-brass wax-gloss"
          :ref="(el: any) => setQuickBtnRef(el, idx)"
          @click="handleQuickReply(reply)"
        >
          {{ reply }}
        </view>
      </scroll-view>
    </view>

      <!-- 输入栏 -->
      <view class="input-bar">
        <input
          v-model="inputText"
          class="text-input"
          placeholder="输入你的问题..."
          :placeholder-style="'color: var(--color-text-secondary)'"
          confirm-type="send"
          @confirm="handleSend"
        />
        <view class="send-btn" @click="handleSend">
          <image class="send-icon" src="/static/icons/send_icon.svg" mode="aspectFit" />
        </view>
      </view>
    </view> <!-- end of middle-col -->

    <!-- 右栏: 聊天历史纪录 (宽屏常驻, 移动端隐藏) -->
    <view class="right-col">
      <view class="history-header">
        <text class="font-heading brass-text history-title">命运回溯 (历史)</text>
      </view>
      <scroll-view scroll-y class="history-list">
        <view class="history-item border-brass wax-gloss" v-for="i in 5" :key="i">
          <text class="hi-title">上一次：工作与挑战的指引</text>
          <text class="hi-date">昨日 14:0{{ i }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 占卜遮罩层 -->
    <DivinationOverlay
      v-if="tarotStore.isActive"
      @complete="handleDivinationComplete"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import gsap from 'gsap'
import { useUserStore } from '../../stores/user'
import { useChatStore } from '../../stores/chat'
import { useTarotStore } from '../../stores/tarot'
import Sidebar from '../../components/Sidebar.vue'
import CrystalBall from '../../components/CrystalBall.vue'
import DivinationOverlay from '../../components/DivinationOverlay.vue'

const userStore = useUserStore()
const chatStore = useChatStore()
const tarotStore = useTarotStore()

const sidebarOpen = ref(false)
const inputText = ref('')
const scrollToId = ref('')
const quickRepliesRef = ref<any>(null)
const quickBtnRefs: Record<number, any> = {}

function setQuickBtnRef(el: any, idx: number) {
  if (el) quickBtnRefs[idx] = el
}

// GSAP 弹簧动画 - 快捷回复气泡
watch(() => chatStore.quickReplies.length, () => {
  nextTick(() => {
    Object.entries(quickBtnRefs).forEach(([i, el]) => {
      const dom = el.$el || el
      if (dom) {
        gsap.fromTo(dom,
          { x: 80, opacity: 0, scale: 0.9 },
          {
            x: 0, opacity: 1, scale: 1,
            duration: 0.5,
            delay: Number(i) * 0.1,
            ease: 'elastic.out(1, 0.5)' // 弹簧回弹
          }
        )
      }
    })
  })
})

// 确保有活跃 session
if (!chatStore.currentSession) {
  chatStore.createSession()
}

/** 发送消息 */
async function handleSend() {
  const text = inputText.value.trim()
  if (!text) return

  inputText.value = ''
  chatStore.addUserMessage(text)
  scrollToBottom()

  // 检查是否是"开始占卜"
  if (text === '开始占卜') {
    tarotStore.startDivination(chatStore.currentSession?.title ?? text)
    return
  }

  // 模拟 AI 回复
  chatStore.isAiThinking = true
  await mockAiReply(text)
}

/** 快捷回复 */
function handleQuickReply(reply: string) {
  inputText.value = reply
  handleSend()
}

/** 占卜完成回调 */
function handleDivinationComplete() {
  const drawn = tarotStore.drawnCards
  if (drawn.length === 0) return

  const cards = drawn.map(d => ({
    id: d.card.id,
    name: d.card.name,
    nameEn: d.card.nameEn,
    position: d.position,
    image: d.card.image
  }))

  // 添加卡牌展示消息
  const msgId = chatStore.addAiMessage('塔罗牌给出了祂的指示，让我来为您解读.....', cards)

  // 模拟解读
  chatStore.isAiThinking = true
  setTimeout(() => {
    chatStore.finishStreaming(msgId)
    mockTarotReading(msgId)
  }, 1500)
}

/** Mock AI 回复 */
async function mockAiReply(userMsg: string) {
  await delay(1000)
  chatStore.isAiThinking = false

  const msgId = chatStore.addAiMessage('')

  const response = '遵循宇宙的指引，我聆听到了你灵魂的互换。对我说"开始占卜"，让塔罗牌来为你指引方向。'
  await typewriterEffect(msgId, response)

  chatStore.setQuickReplies(['开始占卜', '我的下一份工作会顺利吗', '我的感情运势如何'])
  scrollToBottom()
}

/** Mock 塔罗解读 */
async function mockTarotReading(_msgId: string) {
  await delay(1500)
  chatStore.isAiThinking = false

  const readingId = chatStore.addAiMessage('')
  const reading = '本次针对「我的下一份工作会顺利吗」进行塔罗解读。从牌面能量来看，你当下正处于状态回升、机会逐步显现的阶段，过往积累的能力与经验会在新的工作场景中被看见与认可，求职与入职过程整体平稳，沟通顺畅，阻碍较少，团队氛围与工作节奏也能与你适配，虽会有需要适应与学习的部分，但整体压力可控、发展向好，能够稳步进入新的职业阶段。\n\n综合判定：是 ✦'

  await typewriterEffect(readingId, reading)
  chatStore.setQuickReplies(['开始占卜', '我的感情运势如何'])
  scrollToBottom()
}

/** 打字机效果 */
async function typewriterEffect(msgId: string, text: string) {
  for (let i = 0; i < text.length; i++) {
    chatStore.appendToMessage(msgId, text[i])
    await delay(30 + Math.random() * 20)
  }
  chatStore.finishStreaming(msgId)
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function scrollToBottom() {
  nextTick(() => {
    const msgs = chatStore.currentMessages
    if (msgs.length > 0) {
      scrollToId.value = 'msg-' + msgs[msgs.length - 1].id
    }
  })
}
</script>

<style scoped>
/* 隐藏移动端侧边栏触发头像 */
@media (max-width: 767px) {
  .user-avatar { display: none; }
}

/* 历史纪录分栏样式 */
.history-header {
  padding: 40rpx;
  text-align: center;
  border-bottom: 1px solid var(--color-divider);
}

.history-title {
  font-size: 32rpx;
  font-weight: bold;
}

.history-list {
  flex: 1;
  padding: 20rpx;
  overflow-y: auto;
}

.history-item {
  padding: 24rpx;
  background: var(--color-card-bg);
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  box-sizing: border-box;
}

.hi-title {
  font-size: 26rpx;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
}

.hi-date {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

/* 顶部栏 */
.top-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  padding-top: calc(env(safe-area-inset-top, 0px) + 20rpx);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-divider);
  z-index: 10;
}

.user-avatar {
  width: 72rpx;
  height: 72rpx;
  border: 2px solid var(--color-accent);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.page-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  color: var(--color-text-primary);
}

.top-bar-right {
  width: 72rpx;
}

/* 消息列表 */
.message-list {
  flex: 1;
  padding: 20rpx 24rpx;
}

.welcome-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0 60rpx;
}

.crystal-ball-wrapper {
  margin-bottom: 32rpx;
}

.welcome-text {
  font-size: 36rpx;
  color: var(--color-text-primary);
  margin-bottom: 12rpx;
}

.welcome-sub {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

/* 消息气泡 */
.message-wrapper {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
  gap: 16rpx;
}

.message-user {
  justify-content: flex-end;
}

.message-ai {
  justify-content: flex-start;
}

.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  line-height: 1.6;
}

.bubble-user {
  background-color: var(--color-bubble-user);
  color: var(--color-bubble-user-text);
  border-bottom-right-radius: 4rpx;
}

.bubble-ai {
  background-color: var(--color-bubble-ai);
  color: var(--color-bubble-ai-text);
  border-bottom-left-radius: 4rpx;
  border: 1px solid var(--color-border);
}

.bubble-text {
  font-size: 28rpx;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor-blink {
  animation: blink 0.8s infinite;
  color: var(--color-accent);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 卡牌展示 */
.cards-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
  justify-content: center;
}

.card-mini-container {
  width: 140rpx;
  height: 236rpx; /* Fixed height to prevent chat bubble shift post-flip */
  perspective: 800px;
}

.card-mini-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: flipCard 0.8s ease-out forwards;
  transform: rotateY(-180deg);
}

.card-mini-face {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8rpx;
  background-color: var(--color-card-bg);
}

.card-mini-back {
  transform: rotateY(-180deg);
}

.card-mini-back .card-mini-img {
  height: 180rpx !important;
}

.card-mini-front {
  transform: rotateY(0deg);
}

@keyframes flipCard {
  0% { transform: rotateY(-180deg); }
  100% { transform: rotateY(0deg); }
}

.card-mini-img {
  width: 120rpx;
  height: 160rpx;
  border-radius: 8rpx;
}

.card-mini-name {
  font-size: 20rpx;
  color: var(--color-text-primary);
  margin-top: 4rpx;
  font-family: var(--font-heading);
}

.card-mini-pos {
  font-size: 18rpx;
  color: var(--color-text-secondary);
  margin-bottom: 8rpx;
}

.reading-hint {
  width: 100%;
  text-align: center;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 8rpx;
}

.thinking-bubble {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100rpx;
  min-height: 80rpx;
}

/* 快捷回复 */
.quick-replies {
  padding: 0 24rpx 12rpx;
}

.quick-scroll {
  white-space: nowrap;
}

.quick-btn {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border: 1px solid var(--color-border);
  border-radius: 32rpx;
  font-size: 24rpx;
  color: var(--color-text-primary);
  background: var(--color-card-bg);
}

/* 输入栏 */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16rpx);
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-divider);
  gap: 16rpx;
}

.text-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 36rpx;
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-family: var(--font-body);
}

.send-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-icon {
  width: 40rpx;
  height: 40rpx;
}
</style>
