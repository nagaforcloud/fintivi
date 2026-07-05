#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Starting Fintivi services ==="

# Start dev servers (API + web via turbo)
echo "[dev] Starting pnpm dev..."
cd "$DIR"
pnpm dev &
DEV_PID=$!
echo "[dev] PID: $DEV_PID"

# Wait for both API and web to be ready
echo "[dev] Waiting for servers..."
for i in $(seq 1 30); do
  API_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/v1/health 2>/dev/null || echo "000")
  WEB_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
  if [ "$API_OK" = "200" ] && [ "$WEB_OK" = "200" ]; then
    break
  fi
  sleep 1
done

echo "[dev] API:  http://localhost:8001"
echo "[dev] Web:  http://localhost:5173"

# Start impeccable live if configured
if [ -f "$DIR/.impeccable/live/config.json" ]; then
  echo "[live] Starting impeccable live server..."
  node "$DIR/node_modules/.opencode/skills/impeccable/scripts/live.mjs" 2>/dev/null || \
  node ~/.opencode/skills/impeccable/scripts/live.mjs 2>/dev/null
  echo "[live] Impeccable live helper on port 8400"
  echo "[live] Poll loop running (background)"
fi

echo "=== All services running ==="
echo ""
echo "  API:  http://localhost:8001"
echo "  Web:  http://localhost:5173"
echo "  Live: port 8400 (if configured)"
echo ""
echo "To stop: ./scripts/stop.sh"
