#!/usr/bin/env bash
# Sequential local/staging perf sweep. Each scenario runs back-to-back so
# results are comparable across runs. Pass --quick to slash durations to
# 10s each (smoke-test mode for CI / local sanity).
#
# Required env: K6_BASE_URL, K6_AUTH_TOKEN, K6_TENANT_ID,
# K6_WEBHOOK_SECRET (for webhook-flood). Output JSON is written to
# loadtest/k6/results/<scenario>-<utc>.json which is gitignored.
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
RESULTS_DIR="$ROOT/results"
mkdir -p "$RESULTS_DIR"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed. brew install k6 (macOS) or see https://k6.io/docs/get-started/installation/" >&2
  exit 127
fi

QUICK=0
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=1
  echo "[loadtest] quick mode: capping every scenario at 30s of traffic"
fi

SCENARIOS=(
  "auth-login"
  "patients-list"
  "appointments-create"
  "webhook-flood"
  "whatsapp-send"
)

TS=$(date -u +"%Y%m%dT%H%M%SZ")
for scenario in "${SCENARIOS[@]}"; do
  out="$RESULTS_DIR/${scenario}-${TS}.json"
  echo "[loadtest] running $scenario -> $out"
  EXTRA=()
  if [[ "$QUICK" == "1" ]]; then
    EXTRA+=("--duration" "30s" "--vus" "10")
  fi
  k6 run \
    --summary-export "$out" \
    "${EXTRA[@]}" \
    "$ROOT/scenarios/${scenario}.js"
done

echo "[loadtest] all scenarios complete; results in $RESULTS_DIR"
