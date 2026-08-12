#!/usr/bin/env bash
# Simulates a production API startup locally or in CI:
#   1. Builds the API
#   2. Runs the server with the provided production-like environment
#   3. Waits for /api/health/live to respond on port 3001
#
# This catches bootstrap regressions where the process is alive but never binds
# the configured port or takes too long to reach a live HTTP state.
#
# Required environment:
#   DATABASE_URL
#
# Optional environment:
#   JWT_SECRET
#   ENCRYPTION_KEY
#   APP_URL
#   NEXT_PUBLIC_APP_URL
#   NEXT_PUBLIC_API_URL
#   CORS_ORIGINS
#   STORAGE_PROVIDER
#   R2_ACCOUNT_ID
#   R2_ACCESS_KEY_ID
#   R2_SECRET_ACCESS_KEY
#   R2_BUCKET_NAME
#   QUEUE_BACKEND
#   CACHE_BACKEND (defaults to memory)
#   REDIS_URL (only when CACHE_BACKEND=redis)
#   ENABLE_SCHEDULERS
#   RAZORPAY_KEY_ID
#   RAZORPAY_KEY_SECRET
#   RAZORPAY_WEBHOOK_SECRET
#   NODE_ENV (defaults to production)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_FILE="$(mktemp -t docita-api-startup.XXXXXX.log)"
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-120}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-2}"
PORT="${PORT:-3001}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:${PORT}/api/health/live}"
API_READY_URL="${API_READY_URL:-http://127.0.0.1:${PORT}/api/health/ready}"
# Cold-start budget: process launch -> first /health/live 200. The API must
# become live within this window (Fly autostart and slow CI runners get slack;
# tighten per environment when the boot profile is known).
STARTUP_TIME_BUDGET_SECONDS="${STARTUP_TIME_BUDGET_SECONDS:-60}"
# Post-boot readiness latency budget: /health/ready performs a SELECT 1 round
# trip, so this is the cheapest real DB+app latency signal available locally.
HEALTH_READY_LATENCY_BUDGET_MS="${HEALTH_READY_LATENCY_BUDGET_MS:-1000}"

cleanup() {
  if [ -n "${API_PID:-}" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_var DATABASE_URL
export NODE_ENV="${NODE_ENV:-production}"
export JWT_SECRET="${JWT_SECRET:-ci-startup-smoke-jwt-secret-0123456789abcdef}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123}"
export APP_URL="${APP_URL:-https://app.docita.work}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://app.docita.work}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.docita.work/api/v1}"
export CORS_ORIGINS="${CORS_ORIGINS:-https://app.docita.work,https://internal.docita.work}"
export STORAGE_PROVIDER="${STORAGE_PROVIDER:-r2}"
export R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-ci-startup-smoke-account}"
export R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-ci-startup-smoke-access-key}"
export R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-ci-startup-smoke-secret-key}"
export R2_BUCKET_NAME="${R2_BUCKET_NAME:-docita-startup-smoke}"
export QUEUE_BACKEND="${QUEUE_BACKEND:-postgres}"
export CACHE_BACKEND="${CACHE_BACKEND:-memory}"
export ENABLE_SCHEDULERS="${ENABLE_SCHEDULERS:-false}"
export RAZORPAY_KEY_ID="${RAZORPAY_KEY_ID:-rzp_test_ci_startup_smoke}"
export RAZORPAY_KEY_SECRET="${RAZORPAY_KEY_SECRET:-ci-startup-smoke-razorpay-secret}"
export RAZORPAY_WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET:-ci-startup-smoke-razorpay-webhook-secret}"
export PORT

cd "$REPO_ROOT"

echo "==> Verifying database schema before API startup..."
bash scripts/deploy/verify-db-schema-sync.sh

echo "==> Building API..."
pnpm build:api

echo ""
echo "==> Starting API and waiting for ${API_HEALTH_URL}..."
pnpm --filter @docita/api run start:prod >"$LOG_FILE" 2>&1 &
API_PID=$!
START_SECONDS=$SECONDS

deadline=$((SECONDS + STARTUP_TIMEOUT_SECONDS))
while [ "$SECONDS" -lt "$deadline" ]; do
  if curl -fsS "$API_HEALTH_URL" >/dev/null 2>&1; then
    COLD_START_SECONDS=$((SECONDS - START_SECONDS))
    echo "API live in ${COLD_START_SECONDS}s (budget: ${STARTUP_TIME_BUDGET_SECONDS}s)"

    if [ "$COLD_START_SECONDS" -gt "$STARTUP_TIME_BUDGET_SECONDS" ]; then
      echo "API startup smoke failed: cold start ${COLD_START_SECONDS}s exceeds budget ${STARTUP_TIME_BUDGET_SECONDS}s." >&2
      echo "Raise STARTUP_TIME_BUDGET_SECONDS intentionally, or fix the boot regression." >&2
      exit 1
    fi

    # Measure the readiness endpoint (real DB round trip) once the API is live.
    # curl -w gives us the total time; fail if it exceeds the latency budget.
    READY_LATENCY_MS=$(curl -fsS -o /dev/null -w '%{time_total}' "$API_READY_URL" | awk '{printf "%.0f", $1 * 1000}')
    echo "API ready endpoint responded in ${READY_LATENCY_MS}ms (budget: ${HEALTH_READY_LATENCY_BUDGET_MS}ms)"

    if [ "$READY_LATENCY_MS" -gt "$HEALTH_READY_LATENCY_BUDGET_MS" ]; then
      echo "API startup smoke failed: readiness latency ${READY_LATENCY_MS}ms exceeds budget ${HEALTH_READY_LATENCY_BUDGET_MS}ms." >&2
      echo "Raise HEALTH_READY_LATENCY_BUDGET_MS intentionally, or investigate the DB round trip." >&2
      exit 1
    fi

    echo "API startup smoke passed."
    exit 0
  fi

  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited before the health endpoint became ready." >&2
    break
  fi

  sleep "$POLL_INTERVAL_SECONDS"
done

echo ""
echo "API startup smoke failed. Recent logs:" >&2
tail -n 200 "$LOG_FILE" >&2 || true
exit 1
