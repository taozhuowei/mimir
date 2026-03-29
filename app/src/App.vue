<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { useTarotStore } from "./stores/tarot";
import { useUserStore } from "./stores/user";
import type { DrawnResult, ReadingResult } from "./utils/tarotReading";

interface TarotTestPayload {
  question?: string;
  drawnCards?: DrawnResult[];
  readingResult: ReadingResult;
}

function registerTestApi() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }

  const tarotStore = useTarotStore();

  window.__TAROT_TEST_API__ = {
    showResult(payload: TarotTestPayload) {
      tarotStore.currentQuestion = payload.question ?? "";
      tarotStore.drawnCards =
        payload.drawnCards ??
        payload.readingResult.cardDetails.map((detail) => ({
          card: detail.card,
          position: detail.position,
        }));
      tarotStore.readingResult = payload.readingResult;
      tarotStore.phase = "result";
    },
    reset() {
      tarotStore.reset();
    },
  };
}

onLaunch(() => {
  const userStore = useUserStore();
  userStore.initTheme();
  registerTestApi();
});

onShow(() => {
  console.log("App Show");
});
</script>

<style>
@import "./styles/global.css";
</style>
