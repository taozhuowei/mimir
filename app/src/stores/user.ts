import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const gender = ref<'male'|'female'|null>(null)
  const avatar = ref('/static/icons/user_avatar_female.png')
  const isOnboarded = ref(false)
  const currentThemeId = ref('golden_dawn')
  const purchasedThemes = ref<string[]>(['golden_dawn'])

  const cardBackImage = ref('/static/themes/golden_dawn/tarot/card_back.jpeg')

  useThemeSystem()

  function initTheme() {
    // 
  }

  function useThemeSystem() {
    //
  }

  return {
    gender, avatar, isOnboarded, currentThemeId, purchasedThemes,
    cardBackImage, initTheme
  }
})
