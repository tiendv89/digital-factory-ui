#!/usr/bin/env bash
# T6 Browser QA Runner
# Starts the Next.js dev server, runs Playwright browser tests, captures screenshots.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHROME_BIN="/home/agent/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell"
CHROME_LIBS="/tmp/playwright-libs/combined-lib"

export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROME_BIN"
export LD_LIBRARY_PATH="$CHROME_LIBS"

# Ensure screenshots directory exists
mkdir -p "$PROJECT_DIR/screenshots"

echo "=== Starting Next.js dev server ==="
cd "$PROJECT_DIR"

# Set a mock API base URL — all requests will be intercepted by Playwright
export NEXT_PUBLIC_API_BASE_URL="http://localhost:9999"

# Start dev server in background
npm run dev &
DEV_PID=$!

# Wait for the server to be ready
echo "Waiting for dev server..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|30[0-8]"; then
    echo "Dev server ready (attempt $i)"
    break
  fi
  sleep 2
done

echo "=== Running Playwright browser QA tests ==="
npx playwright test --config=playwright.config.ts 2>&1
PLAYWRIGHT_EXIT=$?

echo "=== Stopping dev server ==="
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

echo "=== Playwright exit code: $PLAYWRIGHT_EXIT ==="
if [ -d "screenshots" ]; then
  echo "Screenshots captured:"
  ls -la screenshots/
fi

exit $PLAYWRIGHT_EXIT
