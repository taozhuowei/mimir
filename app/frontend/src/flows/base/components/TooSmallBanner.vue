<template>
  <!--
    TooSmallBanner — viewport < iPhone 8 (375×667) fallback notice.
    rem 链下限锁定在 0.872（FLOOR_RATIO），低于该比例的屏幕等比锁底，
    多余尺寸交由 body overflow:auto 滚动兜底。本 banner 仅在 too-small
    状态下显示，提示用户体验受影响。
  -->
  <view
    v-if="isTooSmall"
    class="too-small-banner"
    role="status"
    aria-live="polite"
  >
    <text class="too-small-banner__text">
      屏幕过小，显示效果可能受影响
    </text>
  </view>
</template>

<script setup lang="ts">
import { useDesignFlexible } from '../../../core/sizing/design_flexible'

const { isTooSmall } = useDesignFlexible()
</script>

<style scoped>
.too-small-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 8px 16px;
  background: rgba(122, 21, 21, 0.92);
  color: #fff;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.too-small-banner__text {
  font-size: 12px;
  letter-spacing: 0.05em;
}
</style>
