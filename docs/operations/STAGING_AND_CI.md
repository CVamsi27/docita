# Staging branch and CI (CI8)

## Staging mirrors `main`

- The `staging` branch is fast-forwarded to match `main` after merges.
- Render staging API auto-deploys from `staging`; it should run the same commit as production-bound `main`.
- Validate on staging before relying on production deploy path filters.

## Pull request CI scope

- App, internal, landing, API, and worker jobs run only when path filters in `scripts/workflow/detect-workflow-scope.mjs` match the diff.
- API unit tests on PRs use `pnpm --filter @docita/api run test:ci` (Jest coverage thresholds).
- Worker runs `pnpm --filter @docita/worker run test:ci`.

## Full-repo gates on `main`

- Heavy jobs (full build, coverage upload, critical E2E) remain on pushes to `main` per workflow path filters.

## Local parity before push

```bash
pnpm --filter @docita/api run test:ci
pnpm --filter @docita/worker run test:ci
pnpm --filter @docita/app run check-types   # when touching app
```
