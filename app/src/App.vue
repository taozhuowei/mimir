<script setup lang="ts">
/**
 * 应用入口
 * onLaunch 时从后端预加载全部 78 张牌数据，缓存到 tarot store。
 * 样式通过 style 块全局引入。
 */
import { onLaunch } from '@dcloudio/uni-app'
import { useTarotStore } from './stores/tarot'

const tarotStore = useTarotStore()

onLaunch(() => {
  tarotStore.loadCards()
})
</script>

<style>
@import "./styles/global.css";
</style>
