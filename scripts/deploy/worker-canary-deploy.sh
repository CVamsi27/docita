#!/usr/bin/env bash
# Automated canary rollout for the background worker (P5.16).
#
# The worker has no HTTP service / health-check endpoint, so "healthy" means
# "the canary machine reached `started` and stayed started across the settle
# window" (a crash-looping process bounces started -> stopped -> starting,
# which fails the window). Live health is out of band: the synthetic monitor
# + scheduler heartbeats cover the worker once promoted.
#
# Usage: $0 <fly-config> <fly-app-name> [settle-seconds]
#   settle-seconds — how long the canary must stay started before promotion
#                    (default 60; CI uses 90).
#
# Requires flyctl on PATH and FLY_API_TOKEN exported. Requires jq (present on
# GitHub ubuntu runners).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <fly-config> <fly-app-name> [settle-seconds]" >&2
  exit 1
fi

config_path="$1"
app_name="$2"
settle_seconds="${3:-60}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required by worker-canary-deploy.sh" >&2
  exit 1
fi

primary_region="$(
  sed -nE "s/^[[:space:]]*primary_region[[:space:]]*=[[:space:]]*['\"]([^'\"]+)['\"][[:space:]]*$/\1/p" "$config_path" |
    head -n 1
)"
if [[ -z "$primary_region" ]]; then
  echo "Unable to read primary_region from ${config_path}" >&2
  exit 1
fi

# 1. Canary: deploy exactly one machine with the new image.
echo "==> Canary deploy ${app_name} in ${primary_region}"
flyctl deploy --config "$config_path" --app "$app_name" --remote-only --canary

# 2. Identify the canary machine (newest by created_at) and verify it stays
#    `started` across the settle window.
canary_id=""
canary_image=""
for _ in $(seq 1 30); do
  machines="$(flyctl machine list --app "$app_name" --json 2>/dev/null || echo "[]")"
  newest="$(echo "$machines" | jq -r 'sort_by(.created_at) | reverse | .[0] // empty')"
  if [[ -n "$newest" ]]; then
    canary_id="$(echo "$newest" | jq -r '.id')"
    canary_image="$(echo "$newest" | jq -r '.imageRef.image // .image // ""')"
    break
  fi
  sleep 2
done

if [[ -z "$canary_id" ]]; then
  echo "::error::Unable to identify the canary machine after deploy" >&2
  exit 1
fi
echo "==> Canary machine: ${canary_id} (${canary_image})"

settle_deadline=$(( $(date +%s) + settle_seconds ))
stable_since=""
while :; do
  state="$(flyctl machine list --app "$app_name" --json 2>/dev/null \
    | jq -r --arg id "$canary_id" '.[] | select(.id == $id) | .state' | head -n 1)"
  now="$(date +%s)"

  if [[ "$state" == "started" ]]; then
    if [[ -z "$stable_since" ]]; then
      stable_since="$now"
      echo "==> Canary started at $(date -u +%H:%M:%S); settling ${settle_seconds}s"
    fi
    if (( now - stable_since >= settle_seconds )); then
      echo "==> Canary stable for ${settle_seconds}s — promoting"
      break
    fi
  else
    if [[ -n "$stable_since" ]]; then
      echo "::error::Canary left started state after reaching it (state=${state}); aborting promote" >&2
      exit 1
    fi
    if [[ "$state" == "stopped" || "$state" == "destroyed" ]]; then
      echo "::error::Canary crashed (state=${state}); aborting promote" >&2
      exit 1
    fi
    echo "    canary state=${state:-unknown}"
  fi

  if (( now > settle_deadline + settle_seconds )); then
    echo "::error::Canary never reached a stable started state within ${settle_seconds}s; aborting promote" >&2
    exit 1
  fi
  sleep 5
done

# 3. Promote: roll the remaining machines to the new image (the same rolling
#    deploy the worker previously used, so no behavior change on success).
echo "==> Promote ${app_name} (rolling)"
flyctl deploy --config "$config_path" --app "$app_name" --remote-only \
  --strategy rolling --ha=false

echo "==> Worker canary rollout complete for ${app_name}"
