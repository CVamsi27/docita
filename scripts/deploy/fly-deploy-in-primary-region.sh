#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <fly-config> <fly-app-name> [extra flyctl deploy args...]" >&2
  exit 1
fi

config_path="$1"
app_name="$2"
shift 2

primary_region="$(
  sed -nE "s/^[[:space:]]*primary_region[[:space:]]*=[[:space:]]*['\"]([^'\"]+)['\"][[:space:]]*$/\\1/p" "$config_path" |
    head -n 1
)"

if [[ -z "$primary_region" ]]; then
  echo "Unable to read primary_region from ${config_path}" >&2
  exit 1
fi

if [[ "$primary_region" != "bom" ]]; then
  echo "::warning::Fly primary region is ${primary_region} (was bom until 2026-07-29 bom capacity outage). Deploying in ${primary_region}." >&2
fi

# Parse --strategy from extra args; default to bluegreen for HTTP apps with
# health checks. Use rolling for apps that have no http_service (e.g. worker).
strategy="bluegreen"
remaining_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --strategy=*) strategy="${1#--strategy=}"; shift ;;
    --strategy) strategy="$2"; shift 2 ;;
    *) remaining_args+=("$1"); shift ;;
  esac
done

deploy_args=(deploy --config "$config_path" --app "$app_name" --remote-only --strategy "$strategy" "${remaining_args[@]}")

echo "Deploying ${app_name} in configured primary region: ${primary_region}"
flyctl "${deploy_args[@]}" --primary-region "$primary_region"
