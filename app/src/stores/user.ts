import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 主题相关配置
  const currentThemeId = ref('golden_dawn')
  const cardBackImage = ref('/static/themes/golden_dawn/tarot/card_back.jpeg')

  function initTheme() {
    // 主题初始化逻辑
  }

  return {
    currentThemeId,
    cardBackImage,
    initTheme
  }
})
