# Local stabilization validation — 8 October 2026

Status: **local corrections verified; production release blocked**. This record
supersedes the local gate status in the historical
[7 October preservation record](2026-10-07-local-preservation-validation.md),
which remains unchanged. It accompanies the approved
[roadmap](../2026-10-07-improvement-roadmap.md) and
[implementation plan](../2026-10-08-stabilization-implementation-plan.md).

## Commits

| Revision    | Result                                                               |
| ----------- | -------------------------------------------------------------------- |
| `c0efa95f9` | Preserved all pending source, configuration and documentation        |
| `4e073ba39` | Approved plan and fail-closed auth startup                           |
| `5f9c4c62e` | Landing HTTP preview hydration with production CSP retained          |
| `a80029536` | Patched compatible dependencies and regenerated lockfile             |
| `8695b73a7` | Internal dashboard contracts, search/paging and authenticated audits |
| `3da680efd` | Cast-scanner export alias regression and correction                  |
| `5b400fd8e` | Unused scheduler placeholder and formatting cleanup                  |

All commits use the normal lint hook. No push was made.

## Scope and corrections

All pre-existing working changes were preserved in `c0efa95f9`; no stashes
existed. This batch stays on `feat/ui-ux-sweep-and-outage-gate`, with no push,
merge, deployment or production database mutation.

- Production/staging startup again requires Turnstile configuration. The obsolete
  optional bypass is removed, with fail-closed regression coverage. Worker JWT
  setup consumes the canonical secret getter.
- Landing CSP retains HTTPS upgrade in production and permits the existing HTTP
  development preview. Browser tests wait for actual island hydration and keyboard
  state changes rather than assuming scripts are already interactive.
- Internal startup mounts the missing shared tooltip provider. Accessibility
  audits authenticate through the real login UI once per browser project, validate
  the INTERNAL response, assert the intended route/content, and fail on missing
  authentication or serious/critical axe violations. Login is scanned anonymously;
  protected pages restore the application's actual session state. Reports are
  isolated by browser project/worker and distinguish failed/unscanned routes.
- Internal dashboard responses now share focused Zod contracts across API and
  clients. The page accepts the real cursor envelope, reports either query's
  error, retries both, and exposes loaded-page facility search and Previous/Next
  controls. Create/edit invalidates both queries and resets paging/search. Empty
  and loading states use shared `DataState`.
- A real-database probe caught Prisma rejecting multiple order keys in one object.
  Pagination now accepts ordered arrays and uses creation time plus ID. A new
  51-row regression proves tied timestamps do not omit or repeat facilities.
- Compatible dependency patches and Sentry 10.x updates reduce audit findings
  from 75 (including one critical) to three. No advisory ignores or unreviewed
  selector-parser major override were added.
- Removed the unused reserved scheduler event, fixed whitespace/formatting, and
  corrected the cast scanner's export-alias false positive with a regression that
  still rejects a real assertion after the export.

## Verification

The full unit/build runs followed dependency and wire-contract updates; the final
ordering/shared-empty-state correction then passed focused service, database and
page tests plus refreshed types/lint and API/internal builds. The four-shard E2E
run below covers the final backend tree.

Ordinary checks use host Node 23.7.0 and pnpm 10.30.3. The API E2E comparison uses
CI's pinned Node 22.22.0, a 4 GB heap and four separate fixture databases. Results
include Turbo cache hits where noted; cached tasks are not fresh executions.

| Gate                                                                | Result                                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                                         | PASS: 48/48 tasks, 44 cached; 5,927 passing unit tests, one explicitly skipped landing test                                                                   |
| `pnpm turbo check-types --continue` after final query/UI correction | PASS: 29/29 tasks, 27 cached                                                                                                                                  |
| `pnpm lint` after final query/UI correction                         | PASS: 11/11 tasks, nine cached; internal lint now includes E2E sources                                                                                        |
| `pnpm build` after dependency/contract updates                      | PASS: 35/35 tasks, 31 cached; final API query correction also rebuilt successfully                                                                            |
| App, internal and landing `build:cloudflare`                        | PASS after dependency/contract updates; production landing CSP retains HTTPS upgrade                                                                          |
| `pnpm verify:standard`                                              | PASS, including 68 standards regressions; explicit missing-latency-baseline skip remains                                                                      |
| `pnpm knip`                                                         | PASS, no findings                                                                                                                                             |
| `pnpm check:hygiene`                                                | PASS                                                                                                                                                          |
| Landing accessibility                                               | PASS: 18/18 browser cases                                                                                                                                     |
| Internal accessibility                                              | PASS: 20/20 with the corrected query and real authenticated fixture                                                                                           |
| Missing-fixture audit (expected failure)                            | Anonymous login passes; protected dashboard fails with the explicit fixture requirement; remaining three routes do not run after the configured failure limit |
| Internal audit gate regressions                                     | PASS: 4/4, including absent auth, unlabelled input and login-redirect rejection                                                                               |
| Facility browser smoke against real fixture API                     | PASS: real login, 50/1 cursor pages without overlap, Previous, search/clear, visible controls at 360px                                                        |
| New database cursor regression                                      | PASS: 1/1 after reproducing Prisma's rejection; focused service tests 9/9 and dashboard tests 3/3                                                             |
| API E2E, final four-shard tree                                      | PASS: 59/59 suites, 469/469 tests across four fresh sequential processes                                                                                      |
| Fixture DB integrity / query plans                                  | PASS: 14/14 integrity checks and 9/9 query-plan checks                                                                                                        |
| Frozen pnpm installation                                            | PASS with the final dependency lockfile                                                                                                                       |
| `pnpm audit --audit-level=high`                                     | FAIL: two high and one moderate finding; zero critical                                                                                                        |

Final shard totals: 1/4 — 15 suites/127 tests; 2/4 — 15/110;
3/4 — 15/97 (including the new cursor regression); 4/4 — 14/135.
All four exit codes are zero.

The initial simultaneous E2E/whole-repository check run overloaded this host:
Prisma schema initialization took 40–44 seconds and exceeded unchanged 30-second
hooks. It was interrupted after those failures and does not count as a passing
run. The final four shards run sequentially. Earlier pre-update shards passed
58 suites/468 tests; that capacity baseline does not replace final-tree evidence.
The original unsharded 4 GB heap abort remains recorded historically.

A cold import in the real-entrypoint regression exceeded its original five-second
limit under whole-repo load. Only this boot test now permits 15 seconds; render and
error-boundary assertions remain unchanged. Internal's 27 files/153 tests pass.
Concurrent Nest builds once collided on `dist`; a subsequent isolated build
passed. No production memory, business timeout, auth limiter or guard was changed
in response to validation capacity failures.

Internal deliberately has no translation bundle (`check:i18n-coverage` documents
this). The JSX literal ratchet was refreshed only for the two changed dashboard
files: dashboard page +10, clinic list −3, net +7 (885 → 892). Other per-file
counts are unchanged. This records intentional English admin controls and shared
state reuse; it does not claim a translation conversion or relax the scanner.

## Dependency blockers

Resolution owners: platform/release for the Astro and build-parser consumers;
repository tooling for brace expansion. These are ownership roles, not approval
to waive the audit or proof of mitigation.

| Dependency and installed version | Finding and consumer                                                                                                      | Disposition                                                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http-cache-semantics` 4.2.0     | [High advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp), declared by Astro 7.3.5 in landing                    | Registry/audit reports no patched version. No `CachePolicy` call site was found in installed Astro source/dist, but that does not prove deployed non-exposure. Keep open; upstream patch or demonstrated mitigation required. |
| `braces` 3.0.3                   | [High advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through micromatch/Jest and repository scanning tools | Installed micromatch invokes brace expansion on patterns. These inspected consumers are development/validation tools; untrusted pattern safety is not proved and no patched version exists. Keep open.                        |
| `postcss-selector-parser` 6.0.10 | [Moderate advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), pinned by Tailwind typography                     | Patch starts at 7.1.6; even the checked current typography release retains the 6.0.10 dependency. Do not force a parser major across its consumer without compatibility proof. Keep open.                                     |

`pnpm audit` remains enforceable and fails at high severity. Sentry's update
removed the older OpenTelemetry advisories without overriding instrumentation
across incompatible 0.x majors. Installation still reports existing peer-range
warnings for TypeScript 6 and ignores the native Sentry CPU profiler build under
the existing build policy. Profiling-enabled production startup was not tested.

## Boundaries and remaining work

The only DB writes were into the owned PostgreSQL 16 container on localhost port
5547, with separate E2E and synthetic INTERNAL/51-facility fixture databases.
The owned container/databases and preview/API processes were removed/stopped
after validation. No
production PHI, provider credentials or production data were used. The browser
fixture uses real backend authentication and RBAC; it is local integration evidence,
not production access or adoption evidence.

The standards command's optional latency check still explicitly skips the absent
`artifacts/api-latency-baseline.json`. The deployment's required latency gate
remains blocked until an operator supplies the measured staging soak. A standards
pass cannot close R02. Production Turnstile/Cloudflare configuration, provider
proof, production-role RLS, migration/rollback and workload evidence remain open
in the [backlog](../DOCITA_IMPROVEMENT_BACKLOG.md).

The scheduler event removal does not implement a cadence table or staleness alert;
T-F1-F6 remains open. The clinician authenticated journeys were not refreshed by
this internal/landing batch. Roadmap phases 2–5 (clinical/financial correctness,
clinician UX, broader surface consistency and scoped feature completion) remain
planned and require their file-level acceptance plans and policy decisions.
Three residual security findings prevent declaring the stabilization release gate
clean. Local commits do not authorize deployment.
