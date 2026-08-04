# Release Evidence Checklist

Per-release evidence index. EXECUTION_PLAN P4.6's exit criterion is that a
release operator can deploy or roll back **without undocumented local
knowledge**; this checklist is the proof-of-readiness record for each
production release and the owner/alert destination for the post-release health
window (P4.5 "release health checklist" item).

Copy this file to `docs/operations/releases/<YYYY-MM-DD>-<scope>.md` (or append
to the current release notes) and fill in the links as each gate passes. A
release is not "done" until section 4 is signed off and the rollback window is
closed deliberately (section 5).

## 1. Commit and checks

- Commit/PR: PR `<#>` → commit `<sha>` on `main`; feature branch deleted after merge
- CI run: link to the green workflow run (job list)
- `pnpm verify:standard` (local): pass/fail + date
- `pnpm audit --audit-level=high`: result; any signed exceptions (link REPO_GAPS rows)

## 2. Tests and audits

- App unit tests: counts / pass (app-vite, internal-vite)
- API tests: count / pass (`pnpm --filter @docita/api run test:ci`)
- E2E: link to Playwright report artifact (critical flows)
- Accessibility: `pnpm audit:app` output / baseline link
- Performance: regenerate `logs/performance/baseline.json` (`pnpm perf:baseline`), attach `pnpm perf:route-budgets` output

## 3. Deployment

- Schema migration: migration name; `db:migrate:dry-run` / `db:migrate:safe` evidence
- Deploy IDs: Fly release IDs (`fly releases` for `docita-api`, `docita-worker`); Cloudflare deployment IDs (`wrangler deployments list` for app-vite / internal-vite / landing); Render staging deploy ID
- Env/secrets changed: list the variable **names** (never values) and the prior value needed to roll back

## 4. Post-release health (within 1 hour)

- Frontend load: `/login` + one protected route load with no chunk-load errors (browser console clean of `Failed to fetch dynamically imported module`)
- API health: `curl -fsS <api>/api/health/live`
- Database: connectivity + migration state
- Redis/cache: reachable
- Queue heartbeat: worker cron start line + queue depth trend
- Sentry: no new release-tagged error spike
- Audit: one representative write/read transaction recorded
- Rollback rehearsal: note the command exercised for this release (API/worker: `fly releases rollback <VERSION>`; frontend: Cloudflare dashboard → Deployments → "Rollback to this deployment")

## 5. Owner and rollback window

- Release owner: `<name>`
- Alert destination: `<channel/paging>` covering the post-release window
- Rollback window closed deliberately: date + sign-off
