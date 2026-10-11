# Ledger implementation design QA

Date: 11 October 2026. Scope: Today in the clinician app, facility review in the internal Dashboard, internal navigation, and their shared record composition. Landing and additional screen families are deferred by the user's clarification.

**Final result: passed**

No actionable P0/P1/P2 findings remain in this composition slice. The approved written specification and canonical contracts take precedence over illustrative raster content. This is local implementation acceptance, not a production deployment or a claim that every app route has been redesigned.

## Source and capture evidence

Source truth: [detailed design](docs/superpowers/specs/2026-10-11-ledger-and-adoption-detailed-design.md), [Today plan](docs/superpowers/plans/2026-10-11-today-ledger.md), [internal plan](docs/superpowers/plans/2026-10-11-internal-facility-ledger.md), and the shared [UI standard](docs/ui/UI_UX_STANDARD_2026.md).

The source boards are stored in `/Users/vamsikrishnachandaluri/.codex-multi-2/generated_images/01a11799-0f96-7852-adc2-54091a88d93a`. Implementation captures and comparisons are stored in `/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation`. These local artifacts contain synthetic fixtures only; browser reports, logs and credentials are excluded from git.

| Surface/theme | Source visual truth | Implementation screenshot | Full-view comparison | Focused record-region comparison |
| --- | --- | --- | --- | --- |
| app-light | [exec-7e002e56-9469-4c85-8158-486251aa1715.png](/Users/vamsikrishnachandaluri/.codex-multi-2/generated_images/01a11799-0f96-7852-adc2-54091a88d93a/exec-7e002e56-9469-4c85-8158-486251aa1715.png) | [app-light.png](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-light.png) | [Side by side](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-light-comparison.png) | [Context details](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-light-context-comparison.png) |
| app-dark | [exec-8d7b90a0-2bac-4e62-972a-2e007000a339.png](/Users/vamsikrishnachandaluri/.codex-multi-2/generated_images/01a11799-0f96-7852-adc2-54091a88d93a/exec-8d7b90a0-2bac-4e62-972a-2e007000a339.png) | [app-dark.png](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-dark.png) | [Side by side](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-dark-comparison.png) | [Context details](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-dark-context-comparison.png) |
| internal-light | [exec-ee147095-2d4c-4c54-8a28-2b71f59cdaf0.png](/Users/vamsikrishnachandaluri/.codex-multi-2/generated_images/01a11799-0f96-7852-adc2-54091a88d93a/exec-ee147095-2d4c-4c54-8a28-2b71f59cdaf0.png) | [internal-light.png](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-light.png) | [Side by side](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-light-comparison.png) | [Context details](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-light-context-comparison.png) |
| internal-dark | [exec-169da2a9-e27d-4b92-ab15-19cee93a161a.png](/Users/vamsikrishnachandaluri/.codex-multi-2/generated_images/01a11799-0f96-7852-adc2-54091a88d93a/exec-169da2a9-e27d-4b92-ab15-19cee93a161a.png) | [internal-dark.png](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-dark.png) | [Side by side](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-dark-comparison.png) | [Context details](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-dark-context-comparison.png) |

App sources: 1486×1058 pixels; internal sources: 1487×1058. Desktop implementation: 1440×1024 CSS pixels and image pixels, density 1. Source boards have no measurable CSS viewport/density; they were resampled to 1440×1024 for equal-frame comparison, with a 32px evidence label above each pair. Full comparison is 2880×1056. Focused evidence uses 370×660 record-region crops at that normalized scale, paired without additional scaling. Combined inputs were inspected, not only separate screenshots.

Desktop app state: four real synthetic appointment records, current encounter A, no selection, three scheduled appointments, no follow-ups due. Internal state: three filtered Demo clinics on the loaded page, facility A selected, current real contact/subscription/count fields. Total platform counts vary as independent E2E fixtures are created; they are not decorative constants.

Phone captures use 390×844 CSS/image pixels at density 1. Small-phone checks use 320×740. Tablet app capture uses 768×1024. Actual browser projects also exercise 1280×720 and tablet widths. Mobile is judged against the written responsive contract; no approved mobile raster exists.

- [app-mobile-light](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-mobile-light.png)
- [app-mobile-dark](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-mobile-dark.png)
- [app-mobile-preview](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-mobile-preview.png)
- [app-phone-small](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-phone-small.png)
- [app-tablet-dark](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/app-tablet-dark.png)
- [internal-mobile-light](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-mobile-light.png)
- [internal-mobile-dark](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-mobile-dark.png)
- [internal-mobile-preview-light](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-mobile-preview-light.png)
- [internal-mobile-preview-dark](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-mobile-preview-dark.png)
- [internal-phone-small](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/internal-phone-small.png)

## Findings and comparison history

| Earlier finding | Severity and impact | Concrete correction | Post-fix evidence |
| --- | --- | --- | --- |
| Clinical/Edit primary actions used Button's neutral default; status fills were overridden by Badge secondary utility classes | P1: task priority and status distinction were lost | Use existing primary variant; add fill-free semantic Badge variant consumed by StatusBadge/PriorityBadge; retain canonical token styles | Desktop/theme pairs and context crops; computed primary/processing color assertions in both actual themes |
| Active badges failed browser contrast at 4.48:1 on a tinted light background | P1: essential status text missed AA | Darken the shared light success token from OKLCH L 0.49 to 0.47; leave dark success semantics intact | Shared color/contrast checks and 20 passing internal accessibility cases |
| Desktop review auto-scrolled the shared table and hid its identity column | P2: selected record could lose table context | Override generic 768px minimum for these small fixed-column ledgers; assign explicit column proportions and retain readable wrapping | Desktop full comparisons; browser table overflow checks |
| Five internal columns were compressed beside the sidebar at 768px | P2: row actions could overflow | Use ListRow groups below lg; use the full table at lg and above | Facility browser tests at all four projects; phone/tablet audit cases |
| Internal wordmark displayed a broken image | P1: brand fidelity failed | Include the exact original wordmark/icon bitmap assets in internal's static bundle | Internal desktop pairs; browser naturalWidth assertion; bundle assets match canonical originals |
| Existing floating Start consultation control performed no action and competed with Today | P1: misleading clinical affordance | Navigate to the queue only on permitted non-workspace routes; Today and consultation routes retain their own actions | Permission/routing tests and Today browser absence check |
| Admin row icon actions had no accessible names | P1: operations were unavailable by name | Name View, Edit, Activate and Deactivate with their actual admin identity; preserve existing requests and disabled behavior | Admin behavior regression and passing internal audit |
| Successful editing could remove the local edit trigger before focus returned | P2: keyboard users lost their initiating position | Restore connected Edit trigger on cancel; fall back to initiating Review after success | Real dialog tests and nested mobile Sheet/Dialog browser tests |
| Today Ask AI lost trigger focus on touch/tablet; topbar AI was inactive | P2: overlay handoff/focus regression | Focus the initiating control before opening; wire global topbar and pinned actions to the existing AI shell | Scoped Today browser tests at all four projects; topbar/pinned shell tests |
| Empty/loading Today date summary could print undefined | P2: visible copy defect | Join the optional canonical queue summary only when present | Empty/new-clinic Today browser regression; populated date captures |

The final visual pass also retained explicit Selected/In Room text, separate current/preview state, quiet peer row actions, and one filled action per active task. Existing loading/error/empty states remain shared DataState surfaces. Failed follow-up requests provide a scoped retry rather than a false empty list.

## Required fidelity surfaces

- **Typography:** Existing Fraunces page/section headings and Inter data identities/body text remain. Patient/facility identity is a sans-serif anchor. Actual fields wrap at phone width; time/count numerals remain aligned. Source display lettering is approximate generated artwork; shared token sizes and actual fonts govern implementation. No arbitrary small-text scale was introduced.
- **Spacing/layout:** Continuous worklists, 320px desktop context, restrained rules and compact action areas replace competing dashboard cards. App rows keep comfortable spacing; internal is denser. Sidebar navigation scrolls independently while its footer remains reachable. Record Sheets replace narrow rails. Phone dock reserves content space, and Continue wraps at 320px without hiding Start next. Existing app sidebar resizing is preserved, so its default width can differ from the board's nominal 224px.
- **Colors/tokens:** One existing palette resolves light/dark, accents and preference behavior. Primary fills, status text, selection, focus and disabled states were checked on actual rendered backgrounds. The generated navy gradients and brighter blue are interpreted through current canonical tokens rather than copied as another palette. Dark text links use readable foreground and underlining.
- **Images/assets:** The original Docita wordmark/icon is reused at its intrinsic aspect ratio; internal ships the same original bytes. Icons use existing primitives/Lucide or retained product assets. Initials are the existing real-data avatar fallback, not invented patient photos. No new stock/image artwork was needed.
- **Copy/content:** Scheduled is derived from the list startTime; no fabricated arrival/token/history/allergy data is added. Actual status labels are preserved. Access tier and subscription status remain separate. Blank supplied values use Not recorded where the canonical contract permits absence; zero counts remain zero. Search scope is visible before typing. App additions are localized in English/Hindi. Internal remains English.

## Intentional differences and remaining scope

The source is a synthetic design board. Actual appointment timing/statuses, follow-up emptiness, individual contact fields, platform summary and disabled cursor controls follow real API responses. No mock task or always-enabled Next was substituted. View selection cannot start or replace a consultation; Start next retains the original permission, mutation and authoritative navigation flow.

The clinician's existing topbar/navigation composition is retained in this slice. Global clinic/search/account additions and the other screen-family layouts remain separately planned work. Internal Billing remains its real navigation destination; the review does not imply a facility-scoped billing snapshot. Landing's adoption design and default-theme proposal are deferred.

P3 follow-up: review shortcut density when additional Today tasks exist, and refine the wider clinician shell as its own tested slice. These do not block the accepted ledger flows.

## Verification and implementation checklist

- [x] App: 965 tests in 184 files; internal: 163 tests in 29 files; shared UI: 150 tests in 35 files. Focused post-polish ledger tests also pass.
- [x] Today ledger: 12 browser cases (preview, actual light/dark token fills, one-request Start next and correct encounter); existing Today/AI/retry: 12 cases; facility review/edit failure/focus: 4 cases. Four additional theme runs explicitly assert actual resolved root theme.
- [x] Accessibility: app 160 cases; internal 20 cases. Scoped AI/retry flows additionally run axe.
- [x] Full lint, app/internal/UI typechecks, repository standards, hygiene, Knip, semantic color and contrast checks.
- [x] Both Cloudflare frontend builds, original-brand asset verification, and clean diff checks.
- [x] Review phone/desktop themes, empty/error recovery, cursor/filter/stale selection, denied/pending actions, nested overlays, focus return and 320px overflow. Browser console error inspection returned no errors for the final manually reviewed workspace sessions.

Repository standards report the existing API-latency baseline as skipped because its staging-soak artifact is absent. Frontend builds retain the existing large-chunk advisory. Neither is represented as a new UI failure or a measured performance improvement. No API/schema migration, deployment or push is included. Local runtime uses a fresh isolated synthetic database with external notification/provider destinations disabled.
