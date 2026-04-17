#!/bin/bash
# End-to-end network error + retry flow test
# Temporarily modifies backend to simulate 500 errors

set -e

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "Error: agent-browser is not installed. Install it first."
  exit 1
fi

SESSION="tarot-error-$(date +%s)"
BASE_URL="http://localhost:3000"
PROJECT="/home/tzw/projects/scales-tarot"

echo "=== E2E Network Error + Retry Test ==="

# Step 1: Temporarily inject backend error
echo "Step 1: Inject backend 500 error"
cp "$PROJECT/server/src/routes/readings.ts" "$PROJECT/server/src/routes/readings.ts.e2e-bak"

cleanup() {
  if [ -f "$PROJECT/server/src/routes/readings.ts.e2e-bak" ]; then
    cp "$PROJECT/server/src/routes/readings.ts.e2e-bak" "$PROJECT/server/src/routes/readings.ts"
    rm -f "$PROJECT/server/src/routes/readings.ts.e2e-bak"
    cd "$PROJECT" && npm run build:server >/dev/null 2>&1
    kill $(lsof -ti:3000) 2>/dev/null || true
    sleep 1
    node "$PROJECT/server/dist/server.js" > /tmp/dev_server.log 2>&1 &
  fi
}
trap cleanup EXIT

sed -i 's/const cards = parseResult.data!.cards/const cards = parseResult.data!.cards\n    \/\/ E2E: simulate error\n    throw new Error("模拟服务器内部错误")/' "$PROJECT/server/src/routes/readings.ts"
cd "$PROJECT" && npm run build:server 2>&1 | tail -n 3
kill $(lsof -ti:3000) 2>/dev/null || true
sleep 1
node "$PROJECT/server/dist/server.js" > /tmp/dev_server_e2e.log 2>&1 &
sleep 3

# Step 2: Open page and start divination
echo "Step 2: Open page and start divination"
agent-browser --session-name "$SESSION" set viewport 390 844
agent-browser --session-name "$SESSION" open "$BASE_URL"
agent-browser --session-name "$SESSION" wait 1000

START_REF=$(agent-browser --session-name "$SESSION" snapshot -i 2>&1 | grep -o 'ref=e[0-9]*' | head -n 1 | cut -d= -f2)
agent-browser --session-name "$SESSION" click "@$START_REF"
agent-browser --session-name "$SESSION" wait 3000

# Step 3: Draw and flip
echo "Step 3: Draw and flip card"
agent-browser --session-name "$SESSION" mouse move 195 450
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 1000
agent-browser --session-name "$SESSION" mouse move 195 750
agent-browser --session-name "$SESSION" mouse down
agent-browser --session-name "$SESSION" mouse up
agent-browser --session-name "$SESSION" wait 15000

# Step 4: Verify error UI
echo "Step 4: Verify error UI"
VERIFY=$(agent-browser --session-name "$SESSION" eval '
  const errorBox = document.querySelector(".error-box");
  const retryBtn = Array.from(document.querySelectorAll(".btn, [role=button]")).find(el => el.textContent.includes("重试"));
  const cardImg = document.querySelector(".front-img");
  JSON.stringify({
    hasError: !!(errorBox || retryBtn),
    hasCard: !!cardImg,
    errorText: errorBox?.textContent?.trim() || retryBtn?.textContent?.trim() || "none"
  });
' 2>&1)
echo "Verify result: $VERIFY"

# Step 5: Cleanup
echo "Step 5: Cleanup"
agent-browser --session-name "$SESSION" close

echo "=== Network Error E2E test completed ==="
