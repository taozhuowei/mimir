import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './user'

export type DivinationPhase = 'idle' | 'shuffling' | 'cutting' | 'drawing' | 'revealing' | 'reading'

export interface TarotCardInfo {
  id: string
  name: string
  nameEn: string
  number: number
  type: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  meaningUpright: string
  meaningReversed: string
  image: string
}

export interface DrawnResult {
  card: TarotCardInfo
  position: 'upright' | 'reversed'
}

export const useTarotStore = defineStore('tarot', () => {
  const phase = ref<DivinationPhase>('idle')
  const drawnCards = ref<DrawnResult[]>([])
  
  // 提供后备兜底卡牌库以防 API 和本地尚未注入
  const allCards = ref<TarotCardInfo[]>([
    {
      id: "the_fool", name: "愚者", nameEn: "The Fool", number: 0, type: "major",
      meaningUpright: "新的开始，冒险，自由", meaningReversed: "鲁莽，冒险失败，不安",
      image: "/static/themes/golden_dawn/tarot/major/major_arcana_00_the_fool.jpeg"
    },
    {
      id: "the_magician", name: "魔术师", nameEn: "The Magician", number: 1, type: "major",
      meaningUpright: "创造力，意志力，技能", meaningReversed: "潜在能力未发挥，欺骗",
      image: "/static/themes/golden_dawn/tarot/major/major_arcana_01_the_magician.jpeg"
    },
    {
      id: "the_high_priestess", name: "女祭司", nameEn: "The High Priestess", number: 2, type: "major",
      meaningUpright: "直觉，潜意识，神秘", meaningReversed: "潜在的秘密，直觉被忽视",
      image: "/static/themes/golden_dawn/tarot/major/major_arcana_02_the_high_priestess.jpeg"
    },
    {
      id: "the_empress", name: "皇后", nameEn: "The Empress", number: 3, type: "major",
      meaningUpright: "母性，丰收，自然", meaningReversed: "过度保护，不生育",
      image: "/static/themes/golden_dawn/tarot/major/major_arcana_03_the_empress.jpeg"
    },
    {
      id: "the_emperor", name: "皇帝", nameEn: "The Emperor", number: 4, type: "major",
      meaningUpright: "权威，结构，秩序", meaningReversed: "独裁，控制欲",
      image: "/static/themes/golden_dawn/tarot/major/major_arcana_04_the_emperor.jpeg"
    }
  ])
  
  const currentQuestion = ref('')

  const isActive = computed(() => phase.value !== 'idle')

  /** 开始占卜 */
  function startDivination(question: string) {
    currentQuestion.value = question
    phase.value = 'shuffling'
    drawnCards.value = []
  }

  /** 切换到下一阶段 */
  function nextPhase() {
    const order: DivinationPhase[] = ['idle', 'shuffling', 'cutting', 'drawing', 'revealing', 'reading']
    const idx = order.indexOf(phase.value)
    if (idx < order.length - 1) {
      phase.value = order[idx + 1]
    }
  }

  /** 设置阶段 */
  function setPhase(p: DivinationPhase) {
    phase.value = p
  }

  /** 设置抽取结果 */
  function setDrawnCards(cards: DrawnResult[]) {
    drawnCards.value = cards
  }

  /** 结束占卜 */
  function endDivination() {
    phase.value = 'idle'
  }

  /** 加载所有牌面数据 */
  function setAllCards(cards: TarotCardInfo[]) {
    allCards.value = cards
  }

  /** 随机抽取 3 张牌（本地） */
  function drawThreeCards(): DrawnResult[] {
    const shuffled = [...allCards.value].sort(() => Math.random() - 0.5)
    const drawn = shuffled.slice(0, 3).map(card => ({
      card,
      position: (Math.random() > 0.5 ? 'upright' : 'reversed') as 'upright' | 'reversed'
    }))
    drawnCards.value = drawn
    return drawn
  }

  return {
    phase, drawnCards, allCards, currentQuestion, isActive,
    startDivination, nextPhase, setPhase,
    setDrawnCards, endDivination, setAllCards, drawThreeCards
  }
})
