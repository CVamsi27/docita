# Ledger implementation design QA

Date: 11 October 2026. Scope: Today in the clinician app, facility review in the internal Dashboard, internal navigation, and their shared record composition. This was the initial implementation slice; the workspace-wide continuation is recorded below. Landing remains deferred.

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

Repository standards report the existing API-latency baseline as skipped because its staging-soak artifact is absent. Frontend builds retain the existing large-chunk advisory. Neither is represented as a new UI failure or a measured performance improvement. No API/schema migration or deployment is included. Local runtime uses a fresh isolated synthetic database with external notification/provider destinations disabled.

## Workspace-wide final pass

The continuation extends the approved presentation through both protected workspace roots. It applies continuous neutral Card/Section surfaces and page hierarchy to existing routes; it does not claim bespoke redesigns or mutation testing of every page. Semantic warning/selection colors, overlays, clinical save guards, calendars, forms and contained tables retain their existing behavior. Landing remains deferred. Auth/setup and public/partner/patient/lab shells retain their own composition.

Coverage comes from the actual route trees. The clinician smoke test visits all 51 static protected destinations, including settings subpages, clinical/worklists, billing, operations, analytics, help, specialty, imports and gated surfaces. It checks actual light/dark root theme, a visible page heading, main content containment and absence of uncaught errors at desktop and phone widths. Dynamic patient/encounter records remain covered by the existing critical-flow and consultation acceptance tests; this sweep does not invent dynamic fixtures for every specialty detail page.

The expanded internal audit visits all 18 protected destinations plus Login: Dashboard, Users, Doctors, Admins, Analytics, Performance, Billing, Pricing, Payment Processing, Audits, Logs, Broadcasts, Support, Feedback, Referrals, Leads, Enterprise Contracts and System Monitoring.

| Finding | Correction | Acceptance evidence |
| --- | --- | --- |
| Settings tiles were mouse-only; Audit Log targeted an unimplemented settings tab | Shared list composition with real React Router links; Audit Log opens and scrolls to the existing compliance section | Settings unit regression, manual section navigation and keyboard Enter browser check |
| Internal role filters were clickable Cards without pressed semantics | Shared named Buttons with real counts and `aria-pressed`; two-column phone layout | Filter/dialog regressions and desktop/phone captures |
| Doctor/feedback icon actions and several internal filters lacked names | Record-specific View labels; associated/explicit filter names | Internal units and expanded accessibility audit |
| Payment Processing consumed a paginated clinic response as an array | Canonical shared schema parsing, `items` consumption and clinic-query retry/error handling | Canonical response fixture, exact one-request payment regression and live route audit |
| Wide shared tables could not be reached to scroll by keyboard | Focusable scroll container with visible focus outline | Failing-then-passing focus regression and mobile/tablet audits |
| WhatsApp Sender option descriptions overflowed on desktop | Stack title/description, wrap text and constrain option contents | Real route overflow failure followed by passing theme/viewport sweep |
| Payment Desk date triggers exceeded their fixed field width | Explicit trigger width within existing date field | Route containment browser regression |
| Locked Floor page lacked its page identity | Existing locked-page scaffold accepts a tier or feature; gate authorization is unchanged | Real locked-route heading browser regression |
| Settings' collapsed sidebar clipped its full wordmark and labels | Pass the real collapsed state to existing rail navigation and compact footer controls; mobile sheet remains expanded | Manual corrected brand/form capture and collapsed-shell browser assertions |

Final captures live beside the original approved-board comparisons: `settings-desktop-light.png`, `settings-desktop-dark.png`, `settings-mobile-light.png`, `users-desktop-light.png`, `users-desktop-dark.png`, `users-mobile-light.png`, and `whatsapp-sender-desktop-dark.png`, `floor-locked-desktop-light.png`, and `settings-compact-ai-focus.png`. They show synthetic accounts only. Neutral Cards resolve to transparent backgrounds without shadows; semantic utilities still override that base. The WhatsApp Sender desktop main measured equal client/content widths after correction.

The full app accessibility run passed 160 cases and the expanded internal run passed 76. The additional 40 Login/Today/Settings shell checks after the rail change also passed. Isolated provider configuration was corrected locally when fixture CAPTCHA settings blocked login; product authentication was not changed. Test runtimes use a fresh local synthetic database and disabled external provider destinations.

Final acceptance:

- Full unit suites passed: app 966 tests/184 files, internal 166/29 and shared UI 151/36. A further compact Ask AI keyboard-label/single-open regression passed with focused overlay/settings follow-ups (10 tests), for 1,284 distinct passing unit tests across the runs.
- Clinician route smoke: 51 static routes in both themes at desktop/phone widths (4 passing cases, 204 route visits), plus a passing local free-trial bootstrap run (51 more visits). The final desktop cases assert the compact brand and Settings/Ask AI controls; locked warnings retain a non-transparent boundary.
- Accessibility: 160 full app cases, 76 expanded internal cases, and 40 post-rail shell cases passed (276 total).
- Repository standards, hygiene, Knip, semantic color/contrast checks and clean diff checks passed. The missing staging API-latency baseline remains the previously documented skip.
- Final lint, app/internal/UI typechecks and both Cloudflare builds passed. Existing large-chunk advisories remain informational.

The compact AI control was manually opened from the rail and closed with Escape; focus returned to the initiating button. Its existing coming-soon state and medical-advice footer are preserved. These refinements add no clinical AI capability or new authorization policy.


## Record and page-state completion (2026-10-12)

This pass follows the accepted app/internal ledger design. Landing remains deferred. Inventory was checked against the current React Router trees: 59 protected clinician route patterns (52 static destinations including the Dashboard redirect and seven record detail/edit patterns), and 18 protected internal destinations plus Login. Public, onboarding, patient/partner/lab portals retain their separate layouts and existing flow coverage. The shared route loading fallback also applies to those shells.

| Finding | Correction | Evidence |
| --- | --- | --- |
| Internal sidebar destinations were buttons, with no ordinary link affordances or collapsed keyboard hints | Button-asChild React Router Links, current-page semantics and shared rail tooltips; ordinary mobile navigation closes its sheet | Shell regressions and real internal route audits |
| Internal browser titles reverted to the root default under development StrictMode | A single page metadata owner uses React's native head metadata; protected titles derive from the existing navigation labels | Browser title failure reproduced, then Login/Dashboard passed; full audit asserts each title |
| Disabled PageTabs could still activate, and disabling the current tab removed the tablist from keyboard navigation | Actual disabled buttons and an enabled fallback tab stop | Failing then passing shared tab regressions |
| Analytics treated a failed billing read as empty revenue | Both data sources participate in the page error and Retry | Real React Query failure/retry regression |
| Invoice detail/edit and prescription read failures lost page identity or appeared as missing records | Shared page scaffold/header and loading/error/empty states, retrying the existing query | Record-state unit regressions |
| Prescription read errors raised a toast during render | Visible inline error/retry, with mutation toasts retained in handlers | Rerender regression checks no toast |
| Invoice update controls remained available during a pending save | Existing saving state disables the footer actions and exposes busy semantics | Pending-update regression |
| Invoice descriptions were squeezed to 82px despite staying inside the page | Explicit desktop column widths in the existing contained table; phone item cards retained | Real width failure followed by passing record checks |
| Populated invoice fields and Notes lacked explicit accessible names | Existing translated column labels and associated FormLabel for Notes | Real record axe failures and named-field regressions |
| Patient/prescription/invoice text lost contrast through extra opacity or small primary-colored text in dark mode | Canonical text tokens without opacity for identities, contact/registration labels and document titles | Real populated light/dark contrast audits |
| Cold record reads could remain disabled after permission hydration | Subscribe the data-access bridge to the existing permission store, refreshing query eligibility | Failing/passing transition regression including access loss and planned Claims denial |
| Upgrade displayed inactive controls and a hardcoded obsolete plan list | Compatibility redirect to the canonical Plan & Billing workflow | Route regression and real browser destination/heading assertions |

Populated browser fixtures are created through canonical API schemas in an isolated local synthetic database, with the existing consultation, prescription signature/registration and invoice guards intact. The patient Records tab and all six secondary sections are exercised. Insurance Claims is canonically planned and remains Coming soon on both detail/edit routes; no claim write or access bypass is introduced. Checks preserve real loaded names, invoice line items and encounter workspaces instead of accepting only a heading.

These checks establish layout, navigation, read states and the specified pending-action behavior. They do not establish all role/tier combinations, clinical completion, external message delivery, payment settlement or every lifecycle mutation. External providers are disabled for local review; the existing asynchronous invoice staff-notification listener reported a tenant-context error after a successful invoice fixture write, so notification delivery is not counted as verified.

Final acceptance for this pass:

- Clinician route sweep: eight passing cases, covering all 59 route patterns in both themes on desktop and phone (236 route visits), plus all six patient Records sections. Populated record checks include serious/critical axe findings, loaded identity and readable invoice fields.
- Accessibility: 160 full app cases and 152 internal cases (76 per theme) passed. Internal covers all 18 protected pages and Login on desktop, phone, tablet and laptop.
- Full unit suites: app 972 tests/186 files, internal 170/30 and shared UI 152/36 passed. The subsequently added permission-hydration regression passed in a focused seven-test run, bringing distinct passing unit coverage to 1,295 tests.
- Final lint, app/internal/shared typechecks and both Cloudflare builds passed. Repository standards, hygiene, Knip, duplication and semantic color/contrast checks passed; duplication reports zero clones. The existing missing staging API-latency artifact skip and large frontend chunk advisory remain informational.
- Staged diff checks passed. Runtime fixtures, private credentials, browser reports and generated logs are excluded from the commit.

Final screenshot evidence is under the implementation capture directory's `page-completion` folder. Clinician desktop captures use 1280×720 CSS/image pixels at density 1; phone captures use 390×844 CSS pixels at density 2.75 (1073×2321 image pixels).

| Surface | Light | Dark |
| --- | --- | --- |
| Populated invoice editor, desktop | [Capture](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/page-completion/record-4-light-chromium.png) | [Capture](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/page-completion/record-4-dark-chromium.png) |
| Populated invoice editor, phone | [Capture](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/page-completion/record-4-light-mobile-chrome.png) | [Capture](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/page-completion/record-4-dark-mobile-chrome.png) |
| Internal Dashboard, desktop | [Capture](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/page-completion/internal-dashboard-light-chromium.png) | [Capture](/Users/vamsikrishnachandaluri/.codex-multi-2/visualizations/2026/10/07/01a11799-0f96-7852-adc2-54091a88d93a/ledger-implementation/page-completion/internal-dashboard-dark-chromium.png) |
