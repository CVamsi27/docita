#!/usr/bin/env bash
# Runs a bounded worker window only when the configured worker is stopped.
set -euo pipefail

DURATION_MINUTES="${1-5}"
if [[ $# -gt 1 || ! "$DURATION_MINUTES" =~ ^([1-9]|1[0-5])$ ]]; then
  echo "Usage: $0 [duration-minutes: integer from 1 to 15]" >&2
  exit 2
fi
DURATION_SECONDS=$((DURATION_MINUTES * 60))

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FLY_CONFIG_PATH="$(cd -- "$SCRIPT_DIR/../.." && pwd)/apps/worker/fly.toml"
APP_NAME="$(sed -nE "s/^[[:space:]]*app[[:space:]]*=[[:space:]]*['\"]([^'\"]+)['\"][[:space:]]*(#.*)?$/\1/p" "$FLY_CONFIG_PATH")"
if [[ ! "$APP_NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Error: Unable to resolve one Fly app name from ${FLY_CONFIG_PATH}" >&2
  exit 1
fi

FLY_BIN="$(command -v flyctl || command -v fly || true)"
if [[ -z "$FLY_BIN" ]]; then
  echo "Error: flyctl or fly CLI not found in PATH" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required by run-daily-worker.sh" >&2
  exit 1
fi

echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Reading worker inventory for ${APP_NAME}..."
MACHINES="$("$FLY_BIN" machines list --app "$APP_NAME" --config "$FLY_CONFIG_PATH" --json)"
MACHINE_COUNT="$(jq -er 'if type == "array" then length else error("Machine inventory must be an array") end' <<< "$MACHINES")"
if [[ "$MACHINE_COUNT" != "1" ]]; then
  echo "Error: Expected exactly one worker machine for ${APP_NAME}; found ${MACHINE_COUNT}. Resolve the inventory before draining." >&2
  exit 1
fi
MACHINE_ID="$(jq -er '.[0].id | select(type == "string" and test("^[a-zA-Z0-9]+$"))' <<< "$MACHINES")"
MACHINE_STATE="$(jq -er '.[0].state | select(type == "string")' <<< "$MACHINES")"

case "$MACHINE_STATE" in
  started)
    echo "==> Worker ${MACHINE_ID} is already running; preserving its operating lifecycle."
    exit 0
    ;;
  stopped) ;;
  *)
    echo "Error: Worker ${MACHINE_ID} is in state ${MACHINE_STATE}; only a stopped machine can enter a drain window." >&2
    exit 1
    ;;
esac

OWNS_WORKER=false
STARTING_WORKER=false
SIGNAL_STATUS=0
DRAIN_PID=""

cleanup() {
  local exit_status=$?
  local stop_status
  trap - EXIT
  trap '' INT TERM
  if [[ -n "$DRAIN_PID" ]]; then
    kill "$DRAIN_PID" 2>/dev/null || true
    wait "$DRAIN_PID" 2>/dev/null || true
  fi
  if [[ "$OWNS_WORKER" == true ]]; then
    OWNS_WORKER=false
    echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Stopping worker machine ${MACHINE_ID}..."
    # Allow the worker's 15-second graceful shutdown to finish before SIGKILL.
    if "$FLY_BIN" machine stop "$MACHINE_ID" --app "$APP_NAME" --config "$FLY_CONFIG_PATH" \
      --signal SIGTERM --timeout 30 --wait-timeout 90s; then
      echo "==> Worker machine stopped: ${MACHINE_ID}"
    else
      stop_status=$?
      echo "Error: Failed to stop worker ${MACHINE_ID}; inspect its state before retrying." >&2
      if [[ "$exit_status" == 0 ]]; then
        exit_status="$stop_status"
      fi
    fi
  fi
  exit "$exit_status"
}

handle_signal() {
  SIGNAL_STATUS="$1"
  # Record a successful start before cleaning up a signal received by flyctl.
  if [[ "$STARTING_WORKER" != true ]]; then
    exit "$SIGNAL_STATUS"
  fi
}

trap cleanup EXIT
trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM

echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting worker machine ${MACHINE_ID}..."
STARTING_WORKER=true
if "$FLY_BIN" machine start "$MACHINE_ID" --app "$APP_NAME" --config "$FLY_CONFIG_PATH"; then
  OWNS_WORKER=true
else
  exit $?
fi
STARTING_WORKER=false
if [[ "$SIGNAL_STATUS" != 0 ]]; then
  exit "$SIGNAL_STATUS"
fi
"$FLY_BIN" machine wait "$MACHINE_ID" --app "$APP_NAME" --config "$FLY_CONFIG_PATH" \
  --state started --wait-timeout 90s

echo "==> Worker started. Running queues and outbox for ${DURATION_MINUTES} minute(s)..."
sleep "$DURATION_SECONDS" &
DRAIN_PID=$!
wait "$DRAIN_PID"
DRAIN_PID=""
echo "==> [$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Drain window completed."
