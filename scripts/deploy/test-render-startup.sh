#!/usr/bin/env bash
# Simulates the Render API deployment locally:
#   1. Builds the API (same as Render's build command)
#   2. Runs the server with NODE_ENV=production + RENDER=true
#   3. Waits for startup, then exits — catching any startup validation errors
#
# Usage:
#   ./scripts/deploy/test-render-startup.sh
#
# Prerequisites:
#   - Copy .env.example → .env.render-local and fill in real values
#   - The script reads from that file so your real secrets never touch this script

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/apps/api/.env.render-local"

if [ ! -f "$ENV_FILE" ]; then
  cat >&2 <<EOF
Missing: apps/api/.env.render-local

Create it from the example and fill in your production values:
  cp apps/api/.env.example apps/api/.env.render-local
  # then edit DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, APP_URL, etc.

The file is gitignored — it will never be committed.
EOF
  exit 1
fi

echo "==> Building API..."
cd "$REPO_ROOT"
pnpm build:api

echo ""
echo "==> Starting API with Render-like environment (NODE_ENV=production, RENDER=true)..."
echo "    Startup errors will appear below. Press Ctrl-C after the server starts successfully."
echo ""

# Merge the env file, then force the two Render-specific vars.
# 'env -i' gives a clean environment; we re-add PATH so node/pnpm are found.
env -i \
  PATH="$PATH" \
  HOME="$HOME" \
  RENDER=true \
  NODE_ENV=production \
  $(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | xargs) \
  node "$REPO_ROOT/apps/api/dist/main.js"
