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
  echo "Fly production deploys must remain in Mumbai (bom); found ${primary_region} in ${config_path}" >&2
  exit 1
fi

deploy_args=(deploy --config "$config_path" --app "$app_name" --remote-only --strategy bluegreen "$@")

echo "Deploying ${app_name} in configured primary region: ${primary_region}"
flyctl "${deploy_args[@]}" --primary-region "$primary_region"
