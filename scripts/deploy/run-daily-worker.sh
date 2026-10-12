#!/usr/bin/env bash
# run-daily-worker.sh — boots docita-worker machine, waits for queue/events to drain, and shuts it down.
set -euo pipefail

APP_NAME="${FLY_WORKER_APP:-docita-worker}"
DURATION_MINUTES="${1:-5}"
DURATION_SECONDS=$(( DURATION_MINUTES * 60 ))

# Resolve flyctl or fly
FLY_BIN="$(command -v flyctl || command -v fly || true)"
if [[ -z "$FLY_BIN" ]]; then
  echo "Error: flyctl or fly CLI not found in PATH" >&2
  exit 1
fi

echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Fetching machine ID for app: ${APP_NAME}..."
MACHINE_ID="$("$FLY_BIN" machines list --app "$APP_NAME" --json | jq -r '.[0].id // empty')"

if [[ -z "$MACHINE_ID" ]]; then
  echo "Error: No machine found for app ${APP_NAME}" >&2
  exit 1
fi

echo "==> Found worker machine: ${MACHINE_ID}"

stop_worker() {
  echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Stopping worker machine ${MACHINE_ID}..."
  "$FLY_BIN" machine stop "$MACHINE_ID" --app "$APP_NAME" || true
  echo "==> Worker stopped. Zero compute costs running."
}

# Ensure machine is ALWAYS stopped on script exit, error, or cancellation
trap stop_worker EXIT INT TERM

echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting worker machine ${MACHINE_ID}..."
"$FLY_BIN" machine start "$MACHINE_ID" --app "$APP_NAME"

echo "==> Worker started. Draining queues and outbox for ${DURATION_MINUTES} minute(s)..."
sleep "$DURATION_SECONDS"

echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Drain window completed."
