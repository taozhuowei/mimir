/**
 * 占卜流程状态管理（Pinia Store）
 * 管理整副牌（从 API 加载）、当前问题、抽牌结果、阅读结果及流程阶段。
 * 抽牌（随机选牌）在前端执行；解读（评分）由后端 API 完成。
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { drawThreeCards as drawCards, type DrawnResult, type ReadingResult, type TarotCardInfo } from '../utils/tarotReading'
import { fetchAllCards } from '../api/cards'
import { fetchReading } from '../api/readings'

// 占卜流程阶段
export type DivinationPhase = 'idle' | 'shuffling' | 'cutting' | 'drawing' | 'revealing' | 'result'

export const useTarotStore = defineStore('tarot', () => {
  const phase = ref<DivinationPhase>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  const readingResult = ref<ReadingResult | null>(null)
  const allCards = ref<TarotCardInfo[]>([])      // 从 GET /api/v1/cards 加载
  const currentQuestion = ref('')
  const isCardsLoading = ref(false)
  const cardsLoadError = ref<string | null>(null)

  const isIdle = computed(() => phase.value === 'idle')
  const isAnimating = computed(() => ['shuffling', 'cutting', 'drawing', 'revealing'].includes(phase.value))
  const isResultVisible = computed(() => phase.value === 'result' && readingResult.value !== null)

  /** 应用启动时调用一次，从后端加载全部 78 张牌数据 */
  async function loadCards(): Promise<void> {
    cardsLoadError.value = null
    if (allCards.value.length > 0 || isCardsLoading.value) return
    isCardsLoading.value = true
    try {
      allCards.value = await fetchAllCards()
    } catch (err) {
      cardsLoadError.value = err instanceof Error ? err.message : 'Failed to load card data'
    } finally {
      isCardsLoading.value = false
    }
  }

  function startDivination(question: string) {
    currentQuestion.value = question
    phase.value = 'shuffling'
    drawnCards.value = []
    readingResult.value = null
  }

  function setPhase(nextPhase: DivinationPhase) {
    phase.value = nextPhase
  }

  function revealResult() {
    phase.value = 'result'
  }

  /**
   * 前端随机抽取 3 张牌，同时向后端请求解读结果。
   * 两个操作异步并行：动画播放期间 API 已在后台获取，
   * readingResult 到位后 isResultVisible 自动变为 true。
   */
  async function drawThreeCards(): Promise<DrawnResult[]> {
    const drawn = drawCards(allCards.value)
    drawnCards.value = drawn
    readingResult.value = await fetchReading(drawn)
    return drawn
  }

  function getReadingResult(): ReadingResult | null {
    return readingResult.value
  }

  function reset() {
    phase.value = 'idle'
    drawnCards.value = []
    readingResult.value = null
    currentQuestion.value = ''
  }

  return {
    phase,
    drawnCards,
    allCards,
    currentQuestion,
    isAnimating,
    isIdle,
    isResultVisible,
    readingResult,
    isCardsLoading,
    cardsLoadError,
    loadCards,
    startDivination,
    setPhase,
    revealResult,
    drawThreeCards,
    getReadingResult,
    reset
  }
})
