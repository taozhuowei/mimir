<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "./stores/user";

onLaunch(() => {
  const userStore = useUserStore();
  userStore.initTheme();
});

onShow(() => {
  console.log("App Show");
});
</script>

<style>
@import "./styles/global.css";
</style>
