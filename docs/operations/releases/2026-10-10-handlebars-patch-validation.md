# Handlebars security patch — local acceptance

Date: 10 October 2026. Scope: the approved stabilization roadmap and [patch plan](../2026-10-10-handlebars-patch-plan.md). Local correction verified; production release still has independent blockers.

The refreshed audit reported six advisories: two critical, two high and two moderate. Three affected the installed Handlebars 4.7.9 copy. The maintainer advisories identify 4.7.10 as the patch for [AST type confusion](https://github.com/advisories/GHSA-8r5x-fm3f-whwj), [own-property-check bypass](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) and [unsafe inline embedding of precompiled templates](https://github.com/advisories/GHSA-xw65-4hp5-5hc7).

The existing root override now requires `^4.7.10`. The lock diff changes only that override, Handlebars version/integrity/snapshot and its two ts-jest references. No dependency major or application contract changes. `pnpm why handlebars -r` identifies API and worker development ts-jest consumers; a dependency inventory is not proof that application exposure is impossible.

A controlled local probe against the installed consumer copy reproduced AST execution of a harmless marker on 4.7.9. The same probe on 4.7.10 rejects the malformed AST before the marker executes and retains normal escaped-template rendering. It does not use provider credentials, production input, files or network effects. This validates one reproduced variant; the installed-version audit covers the three patched advisories.

| Check | Result |
| --- | --- |
| Pinned Node 22.22.0 / pnpm 10.30.3 lock update and frozen installation | PASS; scripts intentionally disabled, no new native dependency or install hook required |
| Installed consumer template / controlled AST probe | RED on 4.7.9; PASS on 4.7.10 |
| Entire API unit suite | PASS: 514 suites / 4,033 tests, two workers, 4 GB heap |
| Entire worker unit suite | PASS: one suite / two tests |
| `pnpm lint` | PASS: 11 tasks, eight cached |
| `pnpm turbo check-types --continue` | PASS: 29 tasks, 26 cached |
| Full build | PASS: 35 tasks, 30 cached |
| Standards, Knip, hygiene | PASS: 68 standards regressions and all gates; optional missing API-latency baseline skipped. Knip and hygiene pass |
| `pnpm audit --audit-level=high` | FAIL remains enforceable: zero critical, two high, one moderate; all three Handlebars findings removed |

Residual advisories remain [http-cache-semantics](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) and [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), with no registry-reported patch, plus [selector-parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), whose patched major still requires consumer compatibility evidence. The existing TypeScript peer-range warnings remain; no override allowance or audit threshold was weakened.

The [clinician acceptance](2026-10-10-clinician-a11y-validation.md) is separate. The standalone clinician E2E project had 17 legacy errors at this acceptance date; the [11 October clinician journey follow-up](2026-10-10-clinician-e2e-validation.md) closes that gap with an enforced typecheck and real journeys. Staging latency, provider/production-role/migration/rollback evidence and production credentials remain open. Local commits do not approve release. No push, merge, deployment or production database write is performed.
