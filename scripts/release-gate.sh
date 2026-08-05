#!/usr/bin/env bash
# release-gate.sh — one-shot pre-release verification.
#
# Runs the full `verify:standard` plus the security, dependency, and
# build checks that `RELEASE_EVIDENCE_CHECKLIST.md` requires. Exits
# non-zero on the first failure with the exact command that failed
# and where to look. Designed to be run on a clean `main` checkout
# before tagging a release.
#
# Usage:
#   ./scripts/release-gate.sh                 # full gate
#   ./scripts/release-gate.sh --fast          # pre-push subset (≈30-40s)
#   ./scripts/release-gate.sh --no-build      # skip the 3 cloudflare builds
#
# See:
#   docs/operations/RELEASE_EVIDENCE_CHECKLIST.md
#   docs/analysis/EXECUTION_PLAN.md (P5, Verification matrix)
#   docs/operations/STABILITY_RUNBOOK.md §4
set -euo pipefail

# ---- Args ----
FAST=0
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --fast)     FAST=1 ;;
    --no-build) BUILD=0 ;;
    -h|--help)
      sed -n '2,21p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 64 ;;
  esac
done

# ---- Pretty output ----
BOLD=$'\033[1m'; RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; RST=$'\033[0m'
section() { printf "\n${BOLD}${YLW}==> %s${RST}\n" "$1"; }
ok()      { printf "  ${GRN}✓${RST} %s\n" "$1"; }
die()     { printf "  ${RED}✗ %s${RST}\n" "$1" >&2; exit 1; }
run()     { local cmd="$1"; shift; printf "  $ %s\n" "$cmd"; "$@" || die "command failed: $cmd"; }

# ---- Preflight ----
section "Preflight"
command -v pnpm >/dev/null 2>&1 || die "pnpm not found; install pnpm@10.30.3 first"
command -v node >/dev/null 2>&1 || die "node not found; need >=22.22.0"
ok "pnpm + node present"
[ -f pnpm-lock.yaml ] || die "pnpm-lock.yaml missing; run pnpm install"
ok "lockfile present"

# ---- Install (frozen) ----
section "Install (frozen lockfile)"
run "pnpm install --frozen-lockfile" pnpm install --frozen-lockfile
ok "install complete"

# ---- Lint ----
section "Lint"
run "pnpm lint" pnpm lint
ok "lint"

# ---- Typecheck ----
section "Typecheck (turbo)"
run "pnpm turbo check-types --continue" pnpm turbo check-types --continue
ok "typecheck"

if [ "$FAST" = 1 ]; then
  section "Pre-push subset (--fast) — done"
  printf "${GRN}Fast gate green. Run full gate before tagging.${RST}\n"
  exit 0
fi

# ---- Tests ----
section "Unit tests"
run "pnpm --filter @docita/api test" pnpm --filter @docita/api test
run "pnpm --filter @docita/app-vite test" pnpm --filter @docita/app-vite test
run "pnpm --filter @docita/internal-vite test" pnpm --filter @docita/internal-vite test
ok "unit suites"

# ---- API e2e ----
section "API e2e"
run "pnpm --filter @docita/api run test:e2e" pnpm --filter @docita/api run test:e2e
ok "api e2e"

# ---- Standards ----
section "Repository standards (verify:standard)"
run "pnpm verify:standard" pnpm verify:standard
ok "verify:standard"

# ---- Knip ----
section "Knip (unused exports/types/deps)"
run "pnpm knip" pnpm knip
ok "knip"

# ---- Dependency audit ----
section "Dependency audit (high)"
run "pnpm audit --audit-level=high" pnpm audit --audit-level=high
ok "audit high"

# ---- Prisma + circular ----
section "Prisma boundary + circular deps"
run "pnpm check:prisma-boundary" pnpm check:prisma-boundary
run "pnpm check:circular:enforce" pnpm check:circular:enforce
ok "prisma + circular"

# ---- Suppression ledger sanity (cheap) ----
section "Suppression ledger sanity"
as_cast_count=$(grep -rE "check-as-cast-density: allow-file" \
  apps packages --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v node_modules | grep -v "/dist/" | wc -l | tr -d ' ')
jscpd_ignore=$(node -e "console.log(require('./.jscpd.json').ignore.length)")
zod_parity=$(cat scripts/checks/allowlists/zod-interface-parity.json 2>/dev/null \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
printf "  as-cast allow-file:    %s\n" "$as_cast_count"
printf "  jscpd ignore count:    %s\n" "$jscpd_ignore"
printf "  zod-parity allowlist:  %s\n" "$zod_parity"
ok "ledger printed (no ratchet failures yet — see SUPPRESSION_LEDGER.md for targets)"

# ---- Builds ----
if [ "$BUILD" = 1 ]; then
  section "Builds (root + per-app)"
  run "pnpm build" pnpm build
  run "pnpm --filter @docita/app-vite run build:cloudflare:production" \
    pnpm --filter @docita/app-vite run build:cloudflare:production
  run "pnpm --filter @docita/internal-vite run build:cloudflare:production" \
    pnpm --filter @docita/internal-vite run build:cloudflare:production
  run "pnpm --filter @docita/landing run build:cloudflare:production" \
    pnpm --filter @docita/landing run build:cloudflare:production
  ok "builds (4)"

  # ---- Perf budgets ----
  section "Performance budgets"
  run "pnpm perf:budget:enforce" pnpm perf:budget:enforce
  run "pnpm perf:route-budgets:enforce" pnpm perf:route-budgets:enforce
  ok "perf budgets"

  # ---- A11y budget ----
  section "A11y budget"
  run "pnpm check:a11y-budget:enforce" pnpm check:a11y-budget:enforce
  ok "a11y budget"
fi

# ---- Worker size + headers ----
section "Worker size + headers"
run "pnpm check:worker-size:app-vite" pnpm check:worker-size:app-vite
run "pnpm check:worker-size:internal-vite" pnpm check:worker-size:internal-vite
run "pnpm verify:app-security-headers" pnpm verify:app-security-headers
ok "worker + headers"

# ---- Done ----
section "Release gate"
printf "${GRN}${BOLD}All checks green.${RST}\n"
printf "  - Fill docs/operations/RELEASE_EVIDENCE_CHECKLIST.md\n"
printf "  - Tag the release and merge to main\n"
printf "  - Run pnpm monitor:synthetic after deploy\n"
printf "  - Watch Datadog SLO burn rate for 24h\n"
printf "  - Roll back via fly releases rollback or wrangler rollback if needed\n"
