#!/bin/bash
# End-to-end black-box validation for A.6 layout changes
# Uses agent-browser to capture screenshots at different breakpoints

set -e

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "Error: agent-browser is not installed."
  exit 1
fi

SESSION="tarot-blackbox"
BASE_URL="http://localhost:3000"
OUT_DIR="output/qa-reports/screenshots"
mkdir -p "$OUT_DIR"

echo "=== A.6 Black-box Validation ==="

# 1. Mobile (iPhone SE like)
echo "Step 1: Mobile (375x667)"
agent-browser --session-name "$SESSION" set viewport 375 667
agent-browser --session-name "$SESSION" open "$BASE_URL"
agent-browser --session-name "$SESSION" wait 3000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/01-mobile-home.png"

# Start Divination
START_REF=$(agent-browser --session-name "$SESSION" snapshot -i 2>&1 | grep -o 'ref=e[0-9]*' | head -n 1 | cut -d= -f2)
agent-browser --session-name "$SESSION" click "@$START_REF"
agent-browser --session-name "$SESSION" wait 3000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/02-mobile-overlay-shuffling.png"

# Draw Card
agent-browser --session-name "$SESSION" mouse move 187 333
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 2000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/03-mobile-overlay-drawn.png"

# Flip Card (Starts Revealing)
# Click flip button (usually center bottom)
agent-browser --session-name "$SESSION" mouse move 187 600
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 1000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/04-mobile-revealing-early-loading.png"
echo "Check: Screenshot 04 should show flip animation AND '神谕解读中' loading UI (A.6.6)."

agent-browser --session-name "$SESSION" wait 8000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/05-mobile-result-drawer.png"
echo "Check: Screenshot 05 should show drawer handle and result panel (A.6.4)."

# 2. Desktop (Wide)
echo "Step 2: Desktop (1280x800)"
agent-browser --session-name "$SESSION" set viewport 1280 800
agent-browser --session-name "$SESSION" open "$BASE_URL"
agent-browser --session-name "$SESSION" wait 3000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/06-desktop-home.png"

# Start Divination
START_REF_D=$(agent-browser --session-name "$SESSION" snapshot -i 2>&1 | grep -o 'ref=e[0-9]*' | head -n 1 | cut -d= -f2)
agent-browser --session-name "$SESSION" click "@$START_REF_D"
agent-browser --session-name "$SESSION" wait 3000

# Draw and Flip
agent-browser --session-name "$SESSION" mouse move 640 400
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 2000
agent-browser --session-name "$SESSION" mouse move 640 700
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 8000
agent-browser --session-name "$SESSION" screenshot "$OUT_DIR/07-desktop-result-sidepanel.png"
echo "Check: Screenshot 07 should show side panel with original animation pushed left (A.6.5)."

# Cleanup
agent-browser --session-name "$SESSION" close

echo "=== Validation Scripts Complete ==="
