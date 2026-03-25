import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: number
  /** 占卜结果卡牌（仅 AI 消息） */
  cards?: DrawnCard[]
  /** 是否正在流式输出 */
  isStreaming?: boolean
}

export interface DrawnCard {
  id: string
  name: string
  nameEn: string
  position: 'upright' | 'reversed'  // 正位/逆位
  image: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const quickReplies = ref<string[]>([])
  const isAiThinking = ref(false)

  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) ?? null
  })

  const currentMessages = computed(() => {
    return currentSession.value?.messages ?? []
  })

  /** 创建新会话 */
  function createSession(): string {
    const id = `session_${Date.now()}`
    sessions.value.unshift({
      id,
      title: '新的占卜',
      messages: [],
      createdAt: Date.now()
    })
    currentSessionId.value = id
    return id
  }

  /** 添加用户消息 */
  function addUserMessage(content: string) {
    if (!currentSession.value) createSession()
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    }
    currentSession.value!.messages.push(msg)

    // 更新会话标题（使用第一条用户消息）
    if (currentSession.value!.messages.filter(m => m.role === 'user').length === 1) {
      currentSession.value!.title = content.slice(0, 20)
    }
  }

  /** 添加 AI 消息（支持流式） */
  function addAiMessage(content: string = '', cards?: DrawnCard[]): string {
    if (!currentSession.value) createSession()
    const id = `msg_${Date.now()}_ai`
    const msg: ChatMessage = {
      id,
      role: 'ai',
      content,
      timestamp: Date.now(),
      cards,
      isStreaming: true
    }
    currentSession.value!.messages.push(msg)
    return id
  }

  /** 追加流式内容 */
  function appendToMessage(msgId: string, chunk: string) {
    const session = currentSession.value
    if (!session) return
    const msg = session.messages.find(m => m.id === msgId)
    if (msg) {
      msg.content += chunk
    }
  }

  /** 完成流式输出 */
  function finishStreaming(msgId: string) {
    const session = currentSession.value
    if (!session) return
    const msg = session.messages.find(m => m.id === msgId)
    if (msg) {
      msg.isStreaming = false
    }
  }

  /** 设置快捷回复 */
  function setQuickReplies(replies: string[]) {
    quickReplies.value = replies
  }

  /** 切换到指定会话 */
  function switchSession(sessionId: string) {
    currentSessionId.value = sessionId
  }

  return {
    sessions, currentSessionId, quickReplies, isAiThinking,
    currentSession, currentMessages,
    createSession, addUserMessage, addAiMessage,
    appendToMessage, finishStreaming,
    setQuickReplies, switchSession
  }
})
