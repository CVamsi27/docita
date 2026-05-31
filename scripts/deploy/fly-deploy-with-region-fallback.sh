#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <fly-config> <fly-app-name> [extra flyctl deploy args...]" >&2
  exit 1
fi

config_path="$1"
app_name="$2"
shift 2

# Prefer India-adjacent regions; fall back when Fly reports regional capacity exhaustion.
regions="${FLY_DEPLOY_REGION_FALLBACK:-bom sin maa del}"
deploy_args=(deploy --config "$config_path" --app "$app_name" --remote-only --strategy bluegreen "$@")

last_status=1
for region in $regions; do
  echo "Attempting Fly deploy in region: ${region}"
  if flyctl "${deploy_args[@]}" --primary-region "$region"; then
    echo "Fly deploy succeeded in region: ${region}"
    exit 0
  fi
  last_status=$?
  echo "::warning title=Fly deploy region retry::Deploy failed in ${region} (exit ${last_status}); trying next region if available."
done

echo "Fly deploy failed in all configured regions: ${regions}" >&2
exit "$last_status"
