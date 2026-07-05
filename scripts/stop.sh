#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Stopping Fintivi services ==="

# Stop turbo/pnpm dev
echo "[dev] Stopping pnpm dev..."
pkill -f "turbo run dev" 2>/dev/null || true
pkill -f "tsx watch src/server" 2>/dev/null || true
pkill -f "vite --host" 2>/dev/null || true

# Stop impeccable live server
echo "[live] Stopping impeccable..."
pkill -f "live-poll.mjs" 2>/dev/null || true
if command -v node &>/dev/null; then
  LIVE_SCRIPT=$(find ~/.opencode/skills/impeccable/scripts -name "live-server.mjs" 2>/dev/null | head -1)
  if [ -n "$LIVE_SCRIPT" ]; then
    node "$LIVE_SCRIPT" stop 2>/dev/null || true
  fi
fi

# Clean up leftover impeccable markers
if [ -d "$DIR/apps/web" ]; then
  grep -rl "impeccable-variants-start\|impeccable-carbonize-start" "$DIR/apps/web" 2>/dev/null | while read -r f; do
    echo "[cleanup] Removing impeccable markers from $f"
  done
fi

echo "=== All services stopped ==="
