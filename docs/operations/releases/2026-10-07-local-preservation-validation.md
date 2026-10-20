# Local preservation validation, 7–8 October 2026

Scope: commit all existing eligible project changes on
`feat/ui-ux-sweep-and-outage-gate`, including the final unstaged versions and nine
previously untracked source/config files. The stash list is empty. Planning is
captured in the [improvement roadmap](../2026-10-07-improvement-roadmap.md).

This is a **local preservation record, not release approval**. New corrective
implementation and feature/UI changes await review of the draft roadmap.
No push, merge, production migration or deployment was performed.

## Completed checks

Environment: Node `v23.7.0`, pnpm `10.30.3`. Node meets the manifest floor, but
these checks do not establish equivalence with CI's pinned Node `22.22.0`.

| Command | Result / evidence limit |
| --- | --- |
| `pnpm lint` | Exit 0; initial run 11/11 Turbo cache hits. Later build/test dependency tasks also run lint; API reports one Prettier warning in `billing.module.ts`. |
| `pnpm verify:standard` | Exit 0. Includes Prisma boundary, circular imports, contracts, hygiene and security-header checks. API latency check explicitly skips because the staging baseline is absent. |
| `pnpm turbo check-types --continue` | Exit 0; 29 successful tasks, six cache hits. |
| `pnpm test` | Exit 0; 48 successful tasks, 26 cache hits. API: 514 suites / 4,029 tests; clinician: 169 files / 908 tests; internal: 25 files / 149 tests; worker: two tests. Across workspace summaries, 5,917 tests pass and one landing test is skipped. |
| `pnpm build` | Exit 0; 35 successful tasks, 32 cache hits. Does not constitute a production Docker startup or resource-capacity measurement. |
| App, internal and landing `build:cloudflare` | All exit 0. These are the existing script names; there is no separate `build:cloudflare:production` script. |
| `pnpm knip` | Exit 0, but reports unused reserved enum member `SCHEDULER_STALE`. Do not describe this as zero findings. |
| `pnpm check:hygiene` | Exit 0. |
| `pnpm check:colors` | Exit 0, including contrast tokens. |
| `pnpm check:worker-size` | Exit 0; internal Worker 14.3 KB gzip, landing 583.2 KB gzip; all three measured against their configured cap. |
| `pnpm --filter @docita/worker run lint` | Exit 0, run independently in addition to the workspace lint gate. Worker typecheck and build are included in the successful Turbo runs. |
| `pnpm --filter @workspace/db exec prisma validate` | Exit 0. |
| DB `db:check-integrity` and `db:check-query-plans` | Both exit 0 against the disposable E2E fixture database; nine query-plan cases pass. Fixture volume and the privileged test role do not establish production integrity, capacity or tenant isolation. |
| Secret-pattern review | No matches for private-key blocks or common real provider-token formats across the changed source/config paths. This is a limited pattern scan, not a comprehensive secret audit. Seed-script passwords are sourced from environment variables. |

API E2E ran against a disposable PostgreSQL 16 container on loopback port 5547,
database `docita_test`, with `NODE_OPTIONS=--max-old-space-size=4096`. The
unsharded command **failed with exit 134 / SIGABRT** after 38 completed passing
suites: V8 reports `Reached heap limit Allocation failed - JavaScript heap out
of memory`. It did not produce a complete 58-suite result. No domain assertion
failure was reported before the abort; this is still a failed validation run.
The CI-style four-shard execution has not been refreshed for this tree and is
the next comparison needed before selecting a runner-memory correction. The
harness uses schema push plus the repository's migration-only DDL fixture;
it is not migration deployment evidence or proof using the production role.

## Failed or incomplete checks and confirmed follow-up work

1. **Dependency audit fails:** `pnpm audit --audit-level=high` exits 1 with 75
   advisory findings: four low, 38 moderate, 32 high and one critical. The critical
   finding is the installed Express dependency `proxy-addr`; the advisory provides
   version 2.0.8 as the patch and describes a trust-subnet configuration issue.
   Installed-package presence is not proof that this application's trust
   configuration is exploitable. See the [upstream advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
   Audit also reports no patched release for `http-cache-semantics` and `braces`;
   investigate supported upstream resolution or mitigation rather than hiding
   them. The full dependency list is an input to Phase 1 of the roadmap.
2. **Clinician accessibility is partial:** the first public-route run fails three
   tablet cases because WebKit is not installed. Installing Playwright WebKit
   resolves that tooling failure; the subsequent run passes 12 public cases and
   deliberately skips 148 authenticated cases. This does not prove authenticated
   clinician journeys accessible.
3. **Landing accessibility fails:** the initial launcher exits while a stale
   development server returns `NoManifestAvailable`. Restarting development
   restores HTTP 200. The actual suite then reports 11 passed and seven failed
   across desktop, mobile and tablet interaction cases. A Chromium probe confirms
   the hero ArrowRight control works after hydration, while the spec can press
   it before listeners exist. A WebKit probe captures asset TLS failures and a
   module-import error: development responses include CSP
   `upgrade-insecure-requests` despite serving over HTTP. The plan retains HTTPS
   protection in production while fixing development and hydration readiness.
4. **Internal accessibility is not an acceptance gate:** the command exits 0
   with 20 passes, but the generated report has `seeded: false`, and the spec
   catches errors without rethrowing and never asserts on axe violations. Its
   final report counts ten violations, zero serious/critical; this is not
   protected-page coverage. Require INTERNAL authentication, actual route
   rendering, scanner-error propagation and serious/critical assertions.
5. **Whitespace check fails:** `git diff --cached --check` identifies whitespace
   in `apps/app/src/App.tsx:51` and a trailing blank line in
   `packages/data-access/src/types/app-types.ts:11`. The preservation work does
   not silently edit those pre-existing changes.
6. **Security configuration review:** unstaged changes introduce
   `TURNSTILE_OPTIONAL` and enable it in the production API Fly configuration,
   bypassing fail-closed production/staging bot-check startup. A new worker JWT
   module redundantly falls back to a literal, although the canonical
   `getJwtSecret()` already returns a string or rejects invalid API configuration.
   Both are prioritized for correction; no real credential was found there.
7. **Worker/deployment operating assumptions need evidence:** the new daily
   worker workflow runs for five minutes by default and the Fly configurations
   reduce API/worker memory. Validate scheduler cadence, queue deadlines, peak
   memory and rollback before publishing these operating changes.

Database migration safety, realistic query plans, production-role tenant
isolation, provider smokes, authenticated clinician coverage, staging latency
and restore/rollback evidence remain separate prerequisites. A local commit and
passing unit suites do not close them.

## Artifact handling

Command logs and diagnostic scripts were written under `/tmp`, outside Git.
Browser-generated reports remain ignored. No ignored environment file or real
provider credential is included in the preservation commit. The disposable test
container is removed after its final checks; no user database is reset.
