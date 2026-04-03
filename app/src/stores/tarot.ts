/**
 * 占卜流程状态管理（Pinia Store）
 * 管理整副牌、当前问题、抽牌结果、阅读结果及流程阶段
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  drawThreeCards as drawCards,
  generateReading,
  loadAllCards,
  type DrawnResult,
  type ReadingResult,
  type TarotCardInfo
} from '../utils/tarotReading'

// 占卜流程阶段：
// idle=空闲，shuffling=洗牌中，cutting=切牌中，drawing=抽牌动画中，revealing=揭示中，result=结果页
export type DivinationPhase = 'idle' | 'shuffling' | 'cutting' | 'drawing' | 'revealing' | 'result'

export const useTarotStore = defineStore('tarot', () => {
  const phase = ref<DivinationPhase>('idle')           // 当前流程阶段
  const drawnCards = ref<DrawnResult[]>([])            // 抽出的 3 张牌（含正逆位）
  const readingResult = ref<ReadingResult | null>(null) // 阅读结果（含最终判定 yes/no/uncertain）
  const allCards = ref<TarotCardInfo[]>(loadAllCards()) // 整副 78 张牌（初始化加载）
  const currentQuestion = ref('')                       // 用户当前问题

  // 是否处于空闲状态（可开始新占卜）
  const isIdle = computed(() => phase.value === 'idle')
  // 是否处于动画阶段（用于禁用交互、显示动画 UI）
  const isAnimating = computed(() => ['shuffling', 'cutting', 'drawing', 'revealing'].includes(phase.value))
  // 结果是否可见（阶段为 result 且已生成 readingResult）
  const isResultVisible = computed(() => phase.value === 'result' && readingResult.value !== null)

  // 开始新占卜：保存问题，重置牌组与结果，进入洗牌阶段
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

  // 抽取 3 张牌并立即生成阅读结果，同步存入 store
  function drawThreeCards(): DrawnResult[] {
    const drawn = drawCards(allCards.value)
    drawnCards.value = drawn
    readingResult.value = generateReading(drawn)
    return drawn
  }

  // 获取阅读结果（懒计算）：若已抽牌但未生成结果，则补算
  // 用于抽牌与结果展示分离的场景（如先动画后计算）
  function getReadingResult(): ReadingResult | null {
    if (!readingResult.value && drawnCards.value.length > 0) {
      readingResult.value = generateReading(drawnCards.value)
    }

    return readingResult.value
  }

  // 重置至初始状态（清空所有数据，回到 idle）
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
    startDivination,
    setPhase,
    revealResult,
    drawThreeCards,
    getReadingResult,
    reset
  }
})
