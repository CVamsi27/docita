# Scripts layout (F9–F10)

| Directory | Purpose |
|-----------|---------|
| `scripts/checks/` | Repo invariant guards (`check-*.mjs`) wired into CI via `pnpm verify:standard` |
| `scripts/workflow/` | CI scope detection, hygiene, deployment contracts |
| `scripts/perf/` | Performance and a11y budgets |
| `scripts/ui/` | Design token and contrast tooling |
| `scripts/db/` | Database guardrails and imports |
| `scripts/deploy/` | Deploy smoke tests and header verifiers |
| `scripts/lib/` | Shared helpers for other scripts |

Add new guardrails under `checks/` and register them in `scripts/workflow/detect-workflow-scope.mjs` when they should run on PRs.
