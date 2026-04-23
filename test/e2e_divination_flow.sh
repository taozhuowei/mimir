#!/bin/bash
# End-to-end divination flow test using agent-browser
# Covers: home page → divination → result → back home

set -e

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "Error: agent-browser is not installed. Install it first."
  exit 1
fi

SESSION="tarot-e2e"
BASE_URL="http://localhost:3000"

echo "=== E2E Divination Flow Test ==="
echo "Step 1: Open home page"
agent-browser --session-name "$SESSION" set viewport 390 844
agent-browser --session-name "$SESSION" open "$BASE_URL"
agent-browser --session-name "$SESSION" wait 1000

# Verify home page elements
echo "Step 2: Verify home page elements"
agent-browser --session-name "$SESSION" eval '
  const title = document.querySelector(".title");
  const deck = document.querySelector(".idle-deck");
  const hint = document.querySelector(".touch-hint");
  if (!title || !title.textContent.includes("Scales Tarot")) throw new Error("Title missing");
  if (!deck) throw new Error("Deck missing");
  if (!hint) throw new Error("Touch hint missing");
  "home-page-ok";
'

echo "Step 3: Click start divination"
START_REF=$(agent-browser --session-name "$SESSION" snapshot -i 2>&1 | grep -o 'ref=e[0-9]*' | head -n 1 | cut -d= -f2)
agent-browser --session-name "$SESSION" click "@$START_REF"
agent-browser --session-name "$SESSION" wait 3000

# Verify overlay phase icons
echo "Step 4: Verify overlay phase icons"
agent-browser --session-name "$SESSION" eval '
  const icons = document.querySelectorAll(".phase-step-icon");
  if (icons.length < 4) throw new Error("Phase icons missing: " + icons.length);
  "overlay-ok";
'

echo "Step 5: Click deck to draw card"
agent-browser --session-name "$SESSION" mouse move 195 450
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 1000

echo "Step 6: Click flip button"
agent-browser --session-name "$SESSION" mouse move 195 750
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 8000

# Verify result page elements
echo "Step 7: Verify result page elements"
agent-browser --session-name "$SESSION" eval '
  const resultHero = document.querySelector(".result-hero");
  const resultPanel = document.querySelector(".reading-panel");
  const backBtn = document.querySelector(".action-bar");
  if (!resultHero && !resultPanel) throw new Error("Result panel missing");
  if (!backBtn) throw new Error("Action bar missing");
  "result-page-ok";
'

echo "Step 8: Click back home"
BACK_REF=$(agent-browser --session-name "$SESSION" snapshot -i 2>&1 | grep "回到首页" | grep -o 'ref=e[0-9]*' | head -n 1 | cut -d= -f2)
agent-browser --session-name "$SESSION" click "@$BACK_REF"
agent-browser --session-name "$SESSION" wait 3000

# Verify back on home page
echo "Step 9: Verify back on home page"
agent-browser --session-name "$SESSION" eval '
  const homeTitle = document.querySelector(".title");
  if (!homeTitle || !homeTitle.textContent.includes("Scales Tarot")) throw new Error("Not on home page");
  "back-home-ok";
'

# Cleanup
agent-browser --session-name "$SESSION" close

echo "=== All E2E tests passed ==="
