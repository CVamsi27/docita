# Clinician journey contracts — local acceptance

Started: 10 October 2026. Updated: 11 October 2026. Scope: the approved [roadmap](../2026-10-07-improvement-roadmap.md) and [fixture/contract plan](../2026-10-10-clinician-e2e-harness-plan.md). Local acceptance is complete for this slice; the independent dependency and production release gates remain blocked.

## Findings and resulting behavior

The standalone browser TypeScript project reproduced 17 errors. The affected specs also had stale registration roles, incomplete browser sessions, obsolete routes and optional UI assertions that could pass without exercising the journey. They now use real isolated onboarded clinics, complete existing session helpers and shared request/response contracts. The normal app typecheck includes the entire E2E project, with workspace source aliases aligned across configuration surfaces.

Mandatory assertions exposed production defects rather than fixture-only failures:

- Timeline providers inherited a constructor without Nest injection metadata. Their database reads rejected and the settling registry returned an empty timeline. Injection metadata on the common source base restores all nine providers; a real Nest provider regression requires fulfilled reads and the clinic-owned appointment row.
- Clinic responses returned an absent persistence logo as `null` through an optional-string contract. Response mapping omits absent values and preserves configured logos.
- Fresh doctor profiles returned nullable optional metadata through nonnullable optional fields. Canonical response mapping omits absent metadata while retaining configured values, valid zero amounts and explicitly nullable verification fields. Existing profile history and doctor-create acknowledgements are included in the regression scope.
- Onboarding initialization already returns only `{ onboardingId }`; its shared schema incorrectly required an unreturned, unused `step`. The schema now agrees with the existing service and DTO, without changing session allocation or onboarding state.
- The patient header hid its local contextual AI preview when external processing was disabled. The preview is now available with its patient scope, medical disclaimer and Escape/focus return. Its provider/dialog regression verifies that opening it sends no network request; external processing stays disabled.
- The onboarding-signature preview used the stored write reference for display, discarding the API-resolved local or signed URL. Display now uses that resolved URL; reuse keeps the stored reference. Browser cases require the image to decode.
- Denied feature pages lost their heading when their gate replaced the entire page. Page-level gates now reuse one app-wide wrapper and locked-page composition, including route files and page-content components. This preserves source titles/translations without protected actions and eliminates the reproduced wrapper clone. Locked descriptions use the readable muted-foreground token instead of translucent warning text. Regressions require exactly one H1 in denied and allowed branches, preserve canonical upgrade links or the planned-feature coming-soon state, and cover Daybook's error branch. The separate Analytics upgrade fallback also receives its shared page scaffold/header, retaining its upgrade copy and navigation. Generic inline gates and tier policy are unchanged. Prescription view's pre-gate loading/not-found and Analytics' pre-gate loading/error branches remain outside this repair's heading coverage.
- Workspace verification found a retired landing fetch helper containing only commented code and a skipped no-op test. Neither has a live consumer. Removing them and the stale commented payment redirect leaves executable payment-page behavior and markup unchanged; this removes vacuous reporting, not a coverage gap by itself.

Patient journeys require persisted identity/date/clinic ownership, consent and field validation without a write, list/detail navigation, search/clear, cross-clinic isolation, HTTP 503 recovery through retry, and contextual preview focus return. Critical API journeys require real appointment instants/ownership, dashboard statistics, retained timeline data, clinic settings, tenant isolation and exact invalid-input/auth behavior. Doctor journeys require initially unverified email, an actual verification-token round-trip, signature persistence/reuse, browser registration submission and entry into Today.

## Executed verification

| Check | Result |
| --- | --- |
| Full API unit suite | PASS: 515 suites / 4,052 tests; pinned runtime, one worker |
| Full clinician unit suite | PASS: 180 files / 952 tests, one worker |
| Workspace unit scripts | PASS across all 13 packages: 5,999 tests, zero skips; package workers capped at one, DB script uses its native Node test runner |
| Patient browser journeys | PASS: 28/28; seven real journeys at 360px/1440px in light/dark themes |
| Patient contextual preview axe | PASS: 4/4; trigger and settled dialog have zero findings at both widths/themes |
| Doctor browser journeys | PASS: 8/8; both flows at 360px/1440px light/dark, decoded signature images and persisted registration/reuse |
| Gated-page regressions | PASS: four files / 22 tests; real gate/header/card, original route feature content mocked at the boundary; actual Daybook/Follow-ups state branches. Analytics adds 12 focused cases across two files, including real denied/allowed gate branches |
| Repository-wide types | PASS: 29 tasks / 28 cached, including API source/spec types and the normal app source/all-E2E gate |
| Full API E2E | PASS in four sequential `test:e2e:shard` processes: 59 suites / 471 tests, zero skips; all 59 source specs executed exactly once |
| Full repository build | PASS: 35 tasks / 34 cached |
| Clinician Cloudflare production build | PASS; existing >500 kB chunk warning retained |
| Critical API/session browser checks | PASS: 9/9 against the rebuilt owned API; seven critical contract journeys and two cookie cases |
| Standards / Knip / lint | PASS: 68 standards regressions, zero clones, no new cycles, Prisma boundary and security headers; Knip has no remaining hint. Full lint passes and build refreshes the changed app lint; missing optional API-latency baseline is SKIPPED |
| Colors / hygiene | PASS; token contrast and repository hygiene checks |
| Patient navigation after gate consolidation | PASS: 4/4 saved patient list/detail cases at 360px/1440px light/dark |
| Locked-page responsive contrast | PASS: 16/16 for Lab Tests, Daybook, Follow-ups and Analytics at 360px/1440px light/dark; actual theme/viewport and locked state asserted, zero axe findings of any severity |
| Full clinician accessibility audit | PASS: 160/160 in 8.7 minutes; four fresh project reports contain exactly 40 cases each and zero findings of any severity |
| Dependency audit at high threshold | FAIL: zero critical, two high and one moderate; no external package version changed in this slice |

Earlier failed runs are diagnostic evidence. The first real journey run exposed response and injection defects. The doctor matrix also rejected a stale mandatory-redirect expectation; the corrected journey verifies existing Today access. Five interrupted accessibility runs exposed missing invoice/lab/Daybook/Follow-ups headings, locked-description contrast (3.84:1), and the custom Analytics upgrade screen lacking an H1; none is acceptance. The duplication gate rejected the repeated fallback wrapper before consolidation. The unsharded API E2E process exhausted its 4 GB heap after 38 passing suites; final acceptance reruns every spec in four serial shards, without relaxed assertions or timeouts. That diagnostic also warned about a 5.37-second database reset and 23.65-second schema push; it is not production latency evidence. Two recursive workspace command attempts failed on CLI argument forwarding; final package results come from successful corrected commands. Existing Vite plugin deprecation and jsdom form/navigation warnings remain non-failing diagnostics.

## Reproduction

Use the pinned runtime and owned fixture setup in [TESTING](../../testing/TESTING.md). The API E2E helper resets its database; stop the fixture API before those shards, then restart it for browser journeys.

```sh
export NODE_OPTIONS=--max-old-space-size=4096
pnpm --filter @docita/app run check-types
pnpm --filter @docita/app run test --maxWorkers=1
pnpm --filter @docita/api run test --runInBand
# Run these serially with the explicit disposable DATABASE_URL.
pnpm --filter @docita/api run test:e2e:shard 1/4
pnpm --filter @docita/api run test:e2e:shard 2/4
pnpm --filter @docita/api run test:e2e:shard 3/4
pnpm --filter @docita/api run test:e2e:shard 4/4
pnpm verify:standard
pnpm knip
pnpm audit:app
```

The four-project journey/contrast matrices use temporary Playwright configs at 360px/1440px with explicit light/dark color schemes, one worker and the repository's existing assertion timeouts. Full audit reports retain separate project keys for all 160 executed cases. The final report timestamps are 11 October 2026, 13:19:27–13:25:53 UTC; the four report summaries were checked against the actual run start and every page record, not only the command exit code.

## Release boundaries

Fixtures use pinned Node 22.22.0 and disposable PostgreSQL 16 on localhost 5547. Doctor email verification uses the development API with automatic email verification disabled, provider delivery disabled and the owned database token helper. A clinic-associated, verified account with missing medical registration retains Today access; the journey explicitly opens the targeted profile-completion route. Registration submission does not establish external medical-license approval. These synthetic GENERAL/ESSENTIAL unpaid-trial fixtures do not cover every role/tier, busy clinical lifecycle, treatment completion or external provider delivery. Doctor-history read projections and create acknowledgements are covered; unconsumed history-write acknowledgements are outside this correction's canonical-client scope.

The [dependency acceptance](2026-10-10-handlebars-patch-validation.md) and existing production evidence blockers remain separate. No push, merge, deployment or production database write is performed. Cleanup is complete: owned API/Vite processes and ports 3011/3013 are stopped, the disposable localhost-5547 database/container is removed, and 299 existing upload files traced to those owned fixtures are deleted. Paths were captured before the API E2E database reset and again after final browser verification; cleanup was bounded to those recorded files, not the whole uploads directory. The user database on localhost 5432 and unrelated processes are untouched. Runtime reports stay ignored; no generated reports or temporary probe files are committed.
