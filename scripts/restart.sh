#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Restarting Fintivi services ==="
"$DIR/scripts/stop.sh"
sleep 2
"$DIR/scripts/start.sh"
echo "=== Restart complete ==="
