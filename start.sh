#!/usr/bin/env bash
# Start a local static server for the PWA (Service Worker needs http/https).
set -e
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "محول العملات → http://localhost:${PORT}"
exec python3 -m http.server "${PORT}"
