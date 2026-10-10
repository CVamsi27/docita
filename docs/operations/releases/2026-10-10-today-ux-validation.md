# Today recovery and contextual AI preview — local acceptance

Date: 10 October 2026. Status: **Today slice verified locally; broader clinician audit and production release remain open**. Scope follows the approved [roadmap](../2026-10-07-improvement-roadmap.md), [Today recovery plan](../2026-10-08-today-recovery-plan.md) and [Ask AI shell plan](../2026-10-08-ask-ai-shell-plan.md).

## Reproduction and correction

Today previously considered only dashboard-stat errors, so a failed or malformed appointment query could appear as a healthy empty schedule. The actual query-hook regressions failed three assertions before correction. Both primary query failures now reach the existing error/retry or session-recovery shell through the existing state contract. Optional recent-patient failures remain non-blocking. The six real React Query/data-access regressions cover failure/recovery, schema rejection, 401 classification, stats failure, healthy empty appointments and optional-query failure.

Ask AI's preview was unnamed and omitted its context/disclaimer. Three initial shell assertions failed. The repaired shared Dialog primitives provide an accessible title/description, wrapping context chip, English/Hindi preview and medical-advice disclaimer. Escape closes and restores focus to the actual external trigger. An additional regression failed when a global entry retained previous Today scope; each open now selects the requested context or null. This is a preview repair: no conversational provider, suggestions, prompt submission, history or PHI transfer is delivered.

Real dark-mode axe scanning found the shared empty-state action at 3.89:1 contrast. Both href and callback actions now use the existing foreground token. No theme token or global stylesheet is duplicated. Screenshots of the preview were inspected at 360px dark and 1440px light; the mobile sheet and desktop modal remain readable.

The first browser run failed eight of twelve cases: the mobile header helper selected hidden desktop navigation text; the error assertion included copy removed by the shared message sanitizer; dark-mode scans found the actual action contrast defect. The corrected regression targets main's level-one heading and the rendered alert, retains HTTP 503 interception and restores the real appointments endpoint before clicking retry. Test setup uses complete real login/refresh cookies. Its Turnstile token follows [Cloudflare's public test fixture](https://developers.cloudflare.com/turnstile/troubleshooting/testing/); production verification is unchanged.

## Verified gates

| Check                                                    | Result                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Focused Today + Ask AI unit regressions                  | PASS: 10 tests                                                                    |
| Full clinician unit suite                                | PASS: 171 files, 918 tests                                                        |
| Shared UI unit suite                                     | PASS: 33 files, 146 tests                                                         |
| Today Playwright, real authenticated API fixture         | PASS: 12/12; 360px/1440px, light/dark                                             |
| Axe in Today overlay, failure and recovered empty states | PASS: no serious/critical findings in all four combinations                       |
| `pnpm lint`                                              | PASS: 11 tasks, eight cached; source lint excludes E2E files                      |
| `pnpm turbo check-types --continue`                      | PASS: 29 tasks, 22 cached                                                         |
| `pnpm verify:standard`                                   | PASS: 68 regressions and all gates; optional missing API-latency baseline skipped |
| `pnpm knip`, `pnpm check:colors`, `pnpm check:hygiene`   | PASS                                                                              |
| `pnpm --filter @docita/app build:cloudflare`             | PASS; existing >500 kB chunk warning retained                                     |

Browser and API fixtures use pinned Node 22.22.0, PostgreSQL 16 on localhost 5547 and the owned `docita-codex-today-20261008` container. Test-only `DOCITA_API_E2E=true` permits fixture authentication without production IP throttling; production guards are unchanged. These tests use a synthetic ESSENTIAL clinic and healthy empty workspace, not every role/tier or a busy clinic's consultation lifecycle.

## Boundaries and follow-up

The full clinician audit was subsequently corrected and verified against actual authenticated fixtures; its [final acceptance](2026-10-10-clinician-a11y-validation.md) records 160 cases with zero violations. Its old harness recorded violations without asserting serious/critical absence and overwrote route results across viewport cases. Its first completed project found patient sort ARIA, inventory filter names, subscription progress names and Settings keyboard-scroll failures. Do not interpret its exit code as a clean accessibility gate. These were corrected through the separate [clinician audit correction plan](../2026-10-10-clinician-a11y-plan.md); the stricter Today tests above independently enforce axe results.

The [existing release blockers](2026-10-08-stabilization-validation.md) remain: remaining dependency advisories, production credentials, staging latency and provider/production-role/rollback evidence. The [10 October dependency acceptance](2026-10-10-handlebars-patch-validation.md) refreshes the advisory count after a compatible security patch. No push, merge or deployment occurred. The broader clinical, financial and conversational AI scopes remain open. Owned fixture processes were stopped and the owned test container removed after the clinician/dependency follow-up; the user's database on port 5432 is untouched.
