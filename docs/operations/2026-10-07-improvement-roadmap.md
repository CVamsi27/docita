# Docita stabilization and product improvement roadmap

Date: 7 October 2026. Status: **approved 8 October 2026; Phase 1 local corrections verified; release gate blocked**.

The user approved this roadmap after the preservation commit. The first batch
follows the [security and validation implementation plan](2026-10-08-stabilization-implementation-plan.md).
Current results are in the [8 October validation record](releases/2026-10-08-stabilization-validation.md): auth startup, landing hydration, enforceable internal audits, dashboard contracts/search/pagination and dependency patches are corrected. Three residual dependency advisories and production evidence still block a clean release. Phase 2 is now in progress: the [appointment overlap slice](2026-10-08-appointment-conflict-plan.md) closes the reproduced T-F1-F3 contract gap locally. Its [acceptance evidence](releases/2026-10-08-appointment-conflict-validation.md) is separate from the earlier stabilization record. The [auth status slice](2026-10-08-auth-status-plan.md) also resolves T-F1-F5 by documenting existing HTTP 201 behavior and removing all conformance allowances; see its [acceptance evidence](releases/2026-10-08-auth-status-validation.md). Remaining clinical/financial decisions and phases 3–5 are still planned.

This roadmap responds to the request to commit all existing changes, fix issues,
and improve UI/UX and features, with planning first. It orders the work in the
existing [improvement backlog](DOCITA_IMPROVEMENT_BACKLOG.md); it does not replace
that backlog or claim its unresolved release evidence is complete.

## Current checkout and verified starting point

- Branch: `feat/ui-ux-sweep-and-outage-gate`, three commits ahead of `origin/main`
  with no main-only commits after fetching on 7 October.
- Initial inventory: 620 changed paths: 595 staged paths, 19 paths with unstaged
  changes (three overlap staged paths), and nine untracked source/config files.
- `git stash list` is empty. There is no stashed work to recover.
- Staged work spans API workflows, clinician and internal UI, landing, database
  migrations, shared contracts/primitives, standards checks and release docs.
- `pnpm lint`: pass, 11/11 tasks served from Turbo cache. This is a successful
  gate result, not an independent fresh execution of every linter.
- `pnpm audit --audit-level=high`: fail; 75 advisory findings, comprising four
  low, 38 moderate, 32 high and one critical. Findings include deployed API
  dependencies and development tools; classify both and retain actual results.
- `git diff --cached --check`: whitespace defects in `apps/app/src/App.tsx`
  and `packages/data-access/src/types/app-types.ts`.
- Standards and typechecks pass; Knip exits zero but reports the unused reserved
  `SCHEDULER_STALE` enum member. The standards gate skips the missing API latency
  baseline, so its success does not establish that release prerequisite.
- Other tests/builds and browser checks are being refreshed. Their final results
  belong in the dated validation record before the preservation commit.

The source review also found priority work in the existing unstaged changes:
`TURNSTILE_OPTIONAL` bypasses the production/staging startup requirement and is
enabled in the API Fly configuration. Removing that bypass is required to retain
the fail-closed bot-verification contract. The worker JWT module also adds a
redundant literal fallback despite `getJwtSecret()` already owning this decision;
reuse the canonical getter. Neither observation means a credential was found.
Review the daily five-minute worker window against each scheduled job's actual
cadence before release; starting a worker once daily does not demonstrate that
its other cron deadlines or queue latency requirements are met.

Browser findings carried into 8 October: the clinician public-route audit passes
12 cases after installing missing WebKit, with 148 authenticated cases deliberately
skipped. The landing audit fails seven of 18 interactions; a Chromium probe proves
the hero keyboard control works after hydration, while a WebKit probe captures a
module-import failure with unhydrated controls. Diagnose both the readiness test
and browser module loading before choosing a fix. The internal audit reports 20
passes but its report has `seeded: false`; its catch block swallows failures and it
does not assert on axe violations. Treat authenticated internal accessibility
evidence as **blocked**, and make that audit meaningful in Phase 1.

The WebKit probe traced the import failure to TLS errors fetching Vite scripts,
CSS and images. `apps/landing/src/lib/security-headers.ts` always includes
`upgrade-insecure-requests`, including on the HTTP development server. Scope
development handling to the existing build environment; retain this directive
and HTTPS protection in production. Cover both environments with header tests.

The [historical preservation record](releases/2026-10-07-local-preservation-validation.md)
also records an unsharded API E2E heap abort after 38 passing suites at a 4 GB
heap. Compare the pinned runtime and CI's four-shard topology before choosing a
runner-memory change. Unit, type, full-build and Cloudflare-build gates pass;
they do not make the aborted E2E run complete.

This inventory is a point-in-time snapshot. Historical green checks in the
October release records are context, not evidence for today's tree.

## Approaches and recommendation

| Approach                                                    | Benefit                                                                                           | Cost / limitation                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Stabilize, then improve focused workflows (recommended)** | Preserves existing work; gives each correction or enhancement a reproducible acceptance boundary. | New feature delivery follows the quality and clinical workflow gates.                                  |
| UI/UX-first sweep                                           | Visible consistency improvements across routes arrive earlier.                                    | Dependency, data-integrity and recovery defects remain while the surface grows.                        |
| Broad feature expansion                                     | More product scope lands together.                                                                | Review and rollback become harder; unresolved policy/provider decisions can create incorrect behavior. |

Use the first approach. Commit the already-authorized existing work after local
validation and secret/artifact review. Record failed or blocked checks explicitly;
a preservation commit alone is not approval to push, merge or release.

## Constraints that apply to every phase

- Node.js `>=22.22.0`, `pnpm@10.30.3`, pnpm only. Prefer the pinned `.node-version`
  for final reproducible checks; the initial host reports Node `v23.7.0`.
- Existing paying accounts remain clinic-associated and complete onboarding.
  Introduce required settings through targeted prompts and backfills.
- Shared Zod contracts originate in `packages/types`; repositories contain
  Prisma mapping; tenant/RBAC, PHI encryption and sensitive-operation audit remain
  enforced. No parallel stores or duplicated commercial/clinical definitions.
- Use `@workspace/ui` and the [UI/UX standard](../ui/UI_UX_STANDARD_2026.md).
  Preserve TRACK/SERVICES navigation, command-palette parity, contextual AI scope
  and the medical-advice disclaimer. Use token styles and accessible primitives.
- New product work is implemented as separately reviewable slices. Do not add
  unrequested dependencies, recreate existing modules, relax gates or invent
  provider credentials, retention policies or clinical decisions.
- Preserve the existing checkout; do not switch a dirty tree onto main or staging.
  Future branches originate from current main and obey the two-PR remote cap.

## Phase 0 — Preserve and assess all existing work

**Deliverable:** a local conventional commit covering tracked, staged and
untracked project work, plus a dated check record and this planning document.

1. Inventory index, working tree and stashes; check branch ancestry after fetch.
2. Review newly introduced source/config files and sensitive seed/test changes.
   Exclude credentials and generated/runtime artifacts. Keep ignored env files
   ignored. Reconcile overlapping staged/unstaged edits by committing their final
   working-tree contents, not an older staged version.
3. Run lint, standards, typechecks, unit tests, Knip, dependency audit, hygiene,
   Prisma boundary and circular-import checks. Build all affected apps/packages;
   run Cloudflare production builds and API E2E where the local harness permits.
4. Record exact failures, skipped tests, cache use and credential/environment
   dependencies. Create the commit through normal hooks. Never bypass hooks.

**Acceptance:** every eligible initial changed path is represented by the commit;
no stash is omitted, no secret/runtime artifact is introduced, and the check
record distinguishes passing validation from blocked release evidence.

## Phase 1 — Correct reproducible validation and security failures

**Inputs:** Phase 0 results and current manifests/lockfile.
**Files:** root and app `package.json`, `pnpm-lock.yaml`, failing source/specs,
`knip.json` only for intentional supported patterns, and relevant check scripts.

1. Reproduce each failure independently and trace its source before editing.
2. Correct dependency findings through compatible patched direct/transitive
   releases. Inspect findings without a patched version individually; use a
   supported upstream replacement or mitigation only when its consumer remains
   correct. Do not suppress an advisory merely to obtain a green report.
3. Pin regressions with behavior-level tests for code fixes. Regenerate the
   lockfile with pnpm and verify frozen installation.
4. Fix unused exports/dependencies, type errors, whitespace and standards
   findings without broad exception lists or weakened thresholds.
5. Correct `apps/internal/e2e/accessibility.spec.ts`: require an INTERNAL fixture
   session for protected pages, assert that each intended route rendered, fail
   on serious/critical axe findings and propagate navigation/scanner failures.
   Add regression cases proving missing auth and scan failure fail the audit.
   Investigate landing island hydration and module loading with network/browser
   evidence; readiness checks should await supported interaction state rather
   than make a static SSR button look like a tested working control.
   The first identified files are `apps/landing/src/lib/security-headers.ts` and
   `apps/landing/e2e/accessibility.spec.ts`: pin production CSP, permit the HTTP
   development harness and await hero hydration before keyboard interaction.

**Acceptance:** touched behavior tests, lint, types, standards, Knip and builds
pass; no untriaged high/critical dependency finding remains. Unavailable upstream
patches remain explicit blockers with affected consumers and a mitigation owner.

## Phase 2 — Secure clinical and financial workflow correctness

**Files / boundaries:** appointment use cases and queue repositories under
`apps/api/src/domains/appointments`, IPD repositories and migrations, billing
reconciliation/outbox services, auth controllers, shared contracts, and API E2E.

1. Reconcile existing open items W01-F1/F2, W02-F1/F2, T-F1-F3/F5/F6, F01/F02
   and C01 with code and current evidence; retain their IDs in the backlog.
2. Propose compatibility-preserving auth status documentation as the default;
   a wire-status change needs its own contract review and paired E2E expectations.
3. Define one appointment conflict schema and test preflight and database-race
   rejection paths against it. Decide terminal transitions and retry semantics
   before changing the status machine.
4. For the single-active-admission invariant, provide a read-only duplicate audit,
   a clinical reconciliation procedure, then an index migration and PostgreSQL
   concurrency coverage. Do not automatically rewrite historical admissions.
5. Derive scheduler cadence from the existing cron source before adding staleness
   alerts; test healthy, late, failed and disabled jobs separately.
6. Rehearse payment replay/reconciliation, recovery and two-tenant isolation using
   approved provider/database fixtures. Retention, RTO/RPO and financial policy
   decisions retain their named owners and sign-off requirements.

**Acceptance:** new and pre-change accounts retain workspace access; races have
controlled outcomes; no lost/doubled financial or clinical effect; migrations,
backfills and rollback have real database evidence. Production-role/provider
evidence is not inferred from mocked unit tests.

## Phase 3 — Improve clinician UI/UX by journey

**Files:** existing features in `apps/app/src/features`, shell/navigation,
`packages/ui/src/components`, English/Hindi catalogs, route tests and Playwright
specs; [all-screens matrix](../ui/UI_UX_ALL_SCREENS_AUDIT_MATRIX.md).

Priority order: today's schedule and queue → patient summary and consultation →
prescriptions/labs → invoice/payment → onboarding/settings → supporting services.

For each journey:

1. Record its actual role/tier route, desktop/mobile behavior, click path, loading,
   error, empty and permission states before choosing changes.
2. Keep the primary task visible; reduce redundant steps using existing actions,
   tabs, contextual summaries and shared forms. Avoid introducing a second source
   for patient names, dates, tier labels or feature permissions.
3. Improve hierarchy, density, responsive tables, labels, validation, focus return
   and keyboard access. Localize new clinician copy in English and Hindi.
4. Verify at 360px and 1440px, dark/light themes, keyboard-only use and supported
   roles. Test actual success/error paths and existing-user behavior.

**Acceptance:** shared primitives and token gates pass; affected route tests and
Playwright journeys pass; no new serious/critical accessibility issue; each
measured interaction reduction is recorded in the matrix, without invented
usability or performance claims.

## Phase 4 — Improve internal and landing surfaces

**Files:** `apps/internal/src/features/performance`, system monitoring/admins,
landing pricing/contact components and their proxies; shared UI where reused.

1. Make operational data show time window, sample coverage, freshness and real
   failure states. Distinguish observed activity, demo fixtures and customers.
2. Keep INTERNAL-only data inaccessible to clinicians; retain authorized and
   rejected route tests alongside dashboard tests.
3. Improve administrative filters, pagination and recovery actions using existing
   APIs. Validate landing contact submission, pricing modes and mobile/keyboard
   navigation through the actual same-origin proxy.

**Acceptance:** internal and landing audits pass; proxy production builds and
Worker size/security-header gates pass; displayed metrics and pricing come from
their canonical inputs; contact/provider failures are actionable and controlled.

## Phase 5 — Scoped feature completion

Complete existing unfinished product scope before inventing new modules:

| Slice                               | Dependency                                                                                      | Acceptance                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Partner signup/profile/lead portal  | Existing [partner plan](../REFERRAL_PARTNER_PROGRAM_PLAN.md), approved terms and OTP capability | Signup → verification → consent/profile → lead submission → internal progression E2E, including duplicate and unauthorized cases. |
| Lead calendar/mobile handoff        | Provider credentials, recipient consent, clinic timezone                                        | Stable event/message identity, retry visibility, reschedule/cancellation tests and real provider smoke.                           |
| Payout and clinic discount controls | Finance-approved policy, KYC/bank verification                                                  | Refund/reversal/hold ledger reconciliation; UI and checkout show the same policy snapshot.                                        |
| Small-domain gaps                   | Reproducible tenant/workflow audit for imports, consent, specialty, support                     | A scoped specification and regression per confirmed gap; no generic replacement engine.                                           |

Each slice gets a reviewed specification, file-level implementation plan, schemas,
API/client/UI changes, focused tests and operational documentation before coding.
AI additions need a defined clinical role and evaluation; do not broaden clinical
recommendation behavior as a cosmetic enhancement.

## Phase 6 — Release evidence and completion

Run the repository's relevant local gates and current CI checks on the final
commit, then collect release identity, schema compatibility, rollback rehearsal,
protected-route/browser smoke and the observation window defined by the existing
[release checklist](RELEASE_EVIDENCE_CHECKLIST.md).

Track staging latency baseline, production-role RLS proof, restore/key recovery,
Cloudflare/Turnstile/provider access and workflow enablement separately. Recheck
their live state before release; older records do not establish current access.
Do not enable deployments, mutate production data or publish from this planning
and local-commit request.

**Completion:** every scoped item has acceptance evidence or an explicitly named
external/decision blocker, all eligible local work is committed, and UI/feature
completion claims match tested behavior rather than source presence.
