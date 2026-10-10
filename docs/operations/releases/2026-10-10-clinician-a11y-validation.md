# Clinician accessibility and consultation — local acceptance

Date: 10 October 2026. Scope: the approved [roadmap](../2026-10-07-improvement-roadmap.md), [audit plan](../2026-10-10-clinician-a11y-plan.md) and [consultation plan](../2026-10-10-consultation-route-plan.md). Local browser repairs are verified; production release remains blocked. Broad build verification follows the browser and dependency checks below.

## Findings and resulting behavior

The old harness exited zero with 160 passes while recording serious/critical findings and overwriting viewport reports. It now rejects those findings, requires the requested route, visible main and level-one heading, attaches scan results and preserves project/case-specific reports. Consultation cases additionally require the real fixture patient's name and reject clipping. Healthy and genuinely unlabelled-input scanner fixtures prove the same gate passes/fails.

- Patient sorting is announced on DataTable column headers through typed `ariaSort`; shared Button actions retain their callbacks. The avatar column uses the existing translated Patient label.
- Inventory filters have their existing translated accessible names. Both subscription surfaces name progress meters with their visible labels; shared Progress forwards its value to Radix so 5/10 announces 50 rather than indeterminate progress.
- The protected main is keyboard reachable with a token focus ring and no decorative entrance animation. A real Settings probe confirmed focus and PageDown scrolling.
- Help categories and FAQ headings follow levels one → two → three. The FAQ title remains inside the shared CardTitle primitive.
- Consultation loads through one lazy boundary, uses the canonical patient query/cache for its header, keeps mobile identity separate from actions, repairs history/initials contrast and uses a named keyboard-reachable inner section. Shared step navigation has valid list children, Button actions, active-step semantics and accessible noninteractive compact labels. Its browser readiness helper follows the named region. See the [consultation evidence](2026-10-10-consultation-route-validation.md).

Regressions reproduced the defects before corrections. Concurrent unit attempts timed out and one encountered a Radix/jsdom teardown error; those partial/failed runs are not acceptance. Serial pinned-runtime verification passes without increasing timeouts. A diagnostic audit was deliberately stopped after 121 passes to correct its remaining moderate FAQ finding; the final full audit below was rerun on the corrected source.

## Executed verification

| Check | Result |
| --- | --- |
| Clinician unit suite | PASS: 176 files / 925 tests before the final FAQ-only semantic correction; its two focused Help regressions pass afterwards |
| Shared UI unit suite | PASS: 34 files / 148 tests |
| Strict full `pnpm audit:app` | PASS: 160/160, 10.8 minutes; four reports with 40 cases each, zero violations of any severity |
| Light/dark browser verification | 40/44 initially pass; four Today smoke assertions still expected the retired “Today's queue” copy. Corrected to the actual Queue level-two heading; all four rerun cases pass. Consultation 8/8, Today recovery/AI 8/8 and scanner fixtures 8/8 pass; 16 additional Today viewport scans pass |
| Consultation patient/region probe | PASS: actual named section visible, 89-pixel heading fits within 89 pixels at 390px dark; zero axe findings. Raw-cookie diagnostics reported refresh/health failures; complete-session browser acceptance is separate, and production session behavior is not proved |
| Source lint and repository types | PASS after dependency patch: lint 11 tasks / eight cached; types 29 tasks / 26 cached |
| Standards, Knip, colors, hygiene | PASS after dependency patch: 68 standards regressions and all gates; optional missing API-latency baseline skipped. Knip, colors and hygiene pass |
| Changed E2E specs and imported helpers | PASS: scoped standalone TypeScript configuration for accessibility, scanner gate and Today |
| Entire standalone E2E TypeScript project | FAIL: 17 existing errors in three untouched specs; [separate fixture/contract plan](../2026-10-10-clinician-e2e-harness-plan.md). No whole-E2E typecheck pass is claimed |
| Full repository build | PASS: 35 tasks / 30 cached; existing large-chunk warnings retained |
| Clinician Cloudflare production build | PASS; existing >500 kB chunk warning retained |

Browser fixtures use pinned Node 22.22.0, PostgreSQL 16 on owned localhost 5547 and the real API. Authentication uses complete session cookies and the public Turnstile test token; production guards remain unchanged. The cases use synthetic GENERAL/ESSENTIAL clinician fixtures; feature-gated pages can establish only their rendered gate state, not enabled premium behavior.

## Release boundaries

The [Handlebars acceptance](2026-10-10-handlebars-patch-validation.md) refreshes the installed-dependency audit: zero critical, two high and one moderate advisory remain. Staging latency, production credentials, provider delivery, production-role RLS, migration/rollback and full role/tier evidence remain open. Clinical autosave, treatment completion and busy consultation lifecycle are not established by these read-only workspace scans. Checked-in budget artifacts retain their own provenance; local reports do not silently replace production baselines.

No push, merge, deployment or production database write is performed. Owned preview/API processes are stopped and the owned `--rm` test container is removed after validation. The user's PostgreSQL on port 5432 is untouched.
