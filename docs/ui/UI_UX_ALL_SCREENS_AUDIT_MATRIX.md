# UI/UX All-Screens Audit Matrix

This matrix tracks the UI/UX modernization pass requested on 2026-04-29. Scope is visual and interaction quality only: hierarchy, spacing, responsiveness, accessible states, empty/loading/error states, and consistency with the approved Origin-inspired Docita concept.

Approved concept: `/Users/vamsikrishnachandaluri/.codex/generated_images/019dda61-bfe9-7a92-9b04-5de3a9165a34/ig_084ea2c3c10a3ca70169f2473d33008191bb111cf4f7ab02a3.png`

## Acceptance Checklist

Every route below is covered by the shared UI system pass and the relevant app accessibility/type/lint checks. Browser smoke verification was run at desktop and mobile widths where local auth/backend state allowed rendering.

- Page title hierarchy is clear and section headings are larger than body/help text.
- Primary actions are visually obvious, keyboard reachable, and not crowded.
- Tables, dense rows, dialogs, sheets, cards, and forms use shared shadcn surfaces.
- Loading, empty, and error states are readable and placed in the workflow context.
- No clipped text, horizontal overflow, overlapping content, decorative radial orbs, or one-off global CSS.
- Focus states, hover states, disabled states, and selected states are visible.

## Browser QA Notes

- `apps/landing`: all discovered public/legal routes were smoked at 1440px and 390px. Result: no horizontal overflow, one visible H1 on each route, screenshots saved under `/tmp/docita-landing-*-desktop.png` and `/tmp/docita-landing-*-mobile.png`. The `/` desktop navigation completed visually, but the local smoke status was blocked by the public platform-stats API returning 502 because the backend API was not running.
- `apps/internal`: all discovered internal routes were smoked at 1440px and 390px. Result: no horizontal overflow. Role-gated clinic routes correctly rendered the internal-access message without authenticated clinic-admin state. After the smoke pass, the internal theme default was changed from dark to light and core admin routes were rechecked with screenshots under `/tmp/docita-internal-*-light.png`.
- `apps/app`: **390px Playwright** — `pnpm --filter @docita/app exec playwright test mobile` runs `mobile-forms`, `mobile-protected-routes`, `mobile-portal-routes`, and `mobile-auth-setup` (see `e2e/mobile-route-matrix.ts`). Protected TRACK/SERVICES lists, settings, desk, import, analytics, and dynamic patient/consultation/invoice detail routes are in `mobile-protected-routes.spec.ts` when API + `DATABASE_URL` are available. Portal authenticated routes use OTP fixture insertion (`apps/api/scripts/insert-patient-portal-e2e-otp.ts`). Auth/setup: `/login` and `/forgot-password` in CI; `/reset-password`, `/onboarding`, `/choose-path` are manual or local-only (`skipInCi`). `pnpm audit:app` covers desktop visual/a11y plus a mobile-width axe subset aligned with the protected matrix.

The [10 October Today slice](../operations/releases/2026-10-10-today-ux-validation.md) has 12 enforced authenticated browser cases for primary schedule failure/retry and the scoped AI preview at 360px/1440px in light/dark themes. It covers a synthetic ESSENTIAL clinic with an empty workspace; busy clinical lifecycle and other role/tier combinations remain unverified. The [clinician audit acceptance](../operations/releases/2026-10-10-clinician-a11y-validation.md) now records 160 enforced cases across four viewport projects with zero violations. Consultation also passes actual patient-heading and fit checks at 360px/1440px light/dark. This covers the recorded synthetic role/tier/gated states, not every matrix route or clinical lifecycle. Historical rows below remain historical unless explicitly dated.

The [11 October clinician journey acceptance](../operations/releases/2026-10-10-clinician-e2e-validation.md) records 28 patient journey cases, four patient preview axe cases, eight doctor journey cases and four fresh patient list/detail cases after page-gate consolidation, all at 360px/1440px in light/dark themes. Doctor signature images must decode, and clinic-associated users retain Today access while completing registration explicitly. Page-gate unit regressions exercise real gate/header/card primitives; Documents and the four Claims routes have denied/allowed wrapper coverage, not claims lifecycle evidence. Sixteen additional locked-state checks for Lab Tests, Daybook, Follow-ups and Analytics pass with zero axe findings at both widths/themes, asserting the actual theme and denied state. The refreshed whole audit passes 160/160, with four fresh reports of 40 cases each and zero findings of any severity. GENERAL/ESSENTIAL unpaid-trial fixtures establish their rendered gate states; enabled premium workflows and external medical-license approval remain unverified.

## `apps/app` Routes

| Route                                   | Surface        | QA status                                                                                       |
| --------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `/`                                     | app root       | Browser smoke: unauthenticated redirect shell verified                                          |
| `/forgot-password`                      | auth           | Mobile Playwright overflow (390px) + app audit                                                  |
| `/login`                                | auth           | Mobile Playwright overflow (390px) + multi-device form spec                                     |
| `/reset-password`                       | auth           | Shared auth shell pass + app audit                                                              |
| `/ai-assistant`                         | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/analytics` | protected app | 2026-10-11: custom upgrade screen H1/navigation preserved; denied/allowed unit branches and locked-state axe at 360px/1440px light/dark |
| `/appointments`                         | protected app  | Browser smoke + mobile Playwright overflow (390px)                                              |
| `/billing-locked`                       | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/coding-queue`                         | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/consultation`                         | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/consultation/[id]`                    | protected app  | 2026-10-10: real consultation patient heading/fit and strict axe, 360px/1440px light/dark; lifecycle writes remain open |
| `/dashboard`                            | protected app  | Browser smoke + app audit                                                                       |
| `/daybook` | protected app | 2026-10-11: denied normal/error heading plus allowed actions tested; locked-state axe at 360px/1440px light/dark |
| `/follow-ups` | protected app | 2026-10-11: denied heading and allowed loading/worklist unit branches; locked-state axe at 360px/1440px light/dark |
| `/desk/collect-payment`                 | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/desk/floor`                           | protected app  | Shared app shell pass + app audit; hospital-gated locally                                       |
| `/documents` | protected app | 2026-10-11: denied/allowed header/card wrapper unit coverage; mobile browser audit covers the trial gate state |
| `/hospital/beds`                        | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/import`                               | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/import/excel`                         | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/import/ocr`                           | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/inventory` | protected app | 2026-10-10: strict authenticated axe and named Select trigger render regression |
| `/invoices` | protected app | 2026-10-11: denied/allowed heading and upgrade/action unit coverage; browser audit covers recorded trial gate state |
| `/invoices/new`                         | protected app  | Mobile Playwright overflow (390px) + app audit; auth-gated locally                              |
| `/invoices/[id]`                        | protected app  | Mobile Playwright overflow (390px) when invoice fixture exists                                  |
| `/invoices/[id]/edit`                   | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/insurance-claims` | protected app | 2026-10-11: denied/allowed wrapper units with the real planned-feature card; claims lifecycle remains unverified |
| `/insurance-claims/new` | protected app | 2026-10-11: denied/allowed wrapper units with the real planned-feature card; claims lifecycle remains unverified |
| `/insurance-claims/[id]` | protected app | 2026-10-11: denied/allowed wrapper units with the real planned-feature card; claims lifecycle remains unverified |
| `/insurance-claims/[id]/edit` | protected app | 2026-10-11: denied/allowed wrapper units with the real planned-feature card; claims lifecycle remains unverified |
| `/lab-tests` | protected app | 2026-10-11: denied/allowed header/card unit coverage; locked-state axe at 360px/1440px light/dark |
| `/patients` | protected app | 2026-10-11: seven persisted/validation/isolation/retry/preview journeys in four themes/widths; four list/detail cases rerun after page-gate changes |
| `/patients/[id]` | protected app | 2026-10-11: saved patient identity and list/detail navigation at 360px/1440px light/dark; contextual preview axe/focus return |
| `/prescriptions`                        | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/prescriptions/[id]`                   | protected app  | Mobile Playwright overflow (390px) when prescription exists                                     |
| `/profile`                              | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/referrals`                            | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/settings` | protected app | 2026-10-10: strict authenticated settings/subscription axe; named determinate meters and keyboard scroll probe |
| `/settings/compliance`                  | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/settings/compliance/consent-template` | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/settings/team/join-requests`          | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/settings/whatsapp-sender`             | protected app  | Admin-only route policy + app audit                                                             |
| `/specialty`                            | protected app  | Conditional specialty redirect                                                                  |
| `/specialty/dental-charts`              | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/templates`                            | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/today`                                | protected app  | [10 October acceptance](../operations/releases/2026-10-10-today-ux-validation.md): real error/retry + contextual AI, 360px/1440px light/dark                                                  |
| `/upgrade`                              | protected app  | Redirects to `/settings?tab=subscription`; treat billing UX via Settings subscription tab       |
| `/vaccines`                             | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/whatsapp`                             | protected app  | Operational hub: conversations, campaigns, templates, delivery; mobile route matrix + app audit |
| `/choose-path`                          | setup          | Browser smoke: unauthenticated redirect state verified                                          |

| `/join-clinic`                          | setup          | Shared setup shell pass + app audit                                                             |
| `/join-request-status`                  | setup          | Shared setup shell pass + app audit                                                             |
| `/onboarding`                           | setup          | Shared setup shell pass + app audit                                                             |
| `/upload-signature/[token]`             | setup/tool     | Shared tool shell pass + app audit                                                              |
| `/upload-signature/onboarding`          | setup/tool     | Shared tool shell pass + app audit                                                              |
| `/verify-doctor` | setup | 2026-10-11: eight real registration/signature-reuse cases at 360px/1440px light/dark, decoded images and preserved Today access |
| `/verify-email-sent`                    | setup          | Shared setup shell pass + app audit                                                             |
| `/verify-email`                         | setup          | Shared setup shell pass + app audit                                                             |
| `/verify-email/verified`                | setup          | Shared setup shell pass + app audit                                                             |
| `/mobile-upload/[id]`                   | tool           | Shared tool shell pass + app audit                                                              |
| `/book/[referralCode]`                  | public booking | Shared booking shell pass + app audit                                                           |
| `/visual-test/doctor-workflow`          | tool           | Shared tool shell pass + app audit                                                              |
| `/visual-test/origin-primitives`        | tool           | Shared tool shell pass + app audit                                                              |
| `/visual-test/stats-card`               | tool           | Shared tool shell pass + app audit                                                              |
| `/visual-test/status-badge`             | tool           | Shared tool shell pass + app audit                                                              |
| `/visual-test/ui-contract`              | tool           | Shared tool shell pass + app audit                                                              |
| `/portal`                               | patient portal | Mobile Playwright overflow (390px) with portal OTP fixture                                      |
| `/portal/login`                         | patient portal | Mobile Playwright overflow (390px)                                                              |
| `/portal/appointments`                  | patient portal | Mobile Playwright overflow (390px) with portal OTP fixture                                      |
| `/portal/billing`                       | patient portal | Mobile Playwright overflow (390px) with portal OTP fixture                                      |
| `/portal/history`                       | patient portal | Shared portal shell pass + app audit; auth-gated locally                                        |
| `/portal/medications`                   | patient portal | Shared portal shell pass + app audit; auth-gated locally                                        |
| `/portal/metrics`                       | patient portal | Shared portal shell pass + app audit; auth-gated locally                                        |
| `/portal/prescriptions`                 | patient portal | Shared portal shell pass + app audit; auth-gated locally                                        |
| `/portal/profile`                       | patient portal | Shared portal shell pass + app audit; auth-gated locally                                        |
| `/portal/profile/consent-form`          | patient portal | Shared portal shell pass + app audit; auth-gated locally                                        |

## `apps/internal` Routes

Internal console pages use shared `AppPageScaffold`, `PageHeader`, and page-level `DataState` (2026-05 remediation). Navigation is centralized in `shared/lib/internal-nav.ts` with `AppShell` chrome.

| Route                         | Surface         | QA status                                                                                    |
| ----------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `/`                           | internal root   | Desktop/mobile smoke verified                                                                |
| `/admins`                     | internal admin  | Desktop/mobile smoke verified                                                                |
| `/analytics` | internal admin | 2026-10-11: custom upgrade screen H1/navigation preserved; denied/allowed unit branches and locked-state axe at 360px/1440px light/dark |
| `/audits`                     | internal admin  | Desktop/mobile smoke verified; sidebar entry; `AppPageScaffold` + `PageHeader` + `DataState` |
| `/broadcasts`                 | internal admin  | Desktop/mobile smoke verified                                                                |
| `/enterprise-contracts`       | internal admin  | Desktop/mobile smoke verified; middleware + mobile nav aligned                               |
| `/billing`                    | internal admin  | Desktop/mobile smoke verified; light theme recheck                                           |
| `/dashboard`                  | internal admin  | Desktop/mobile smoke verified; light theme recheck                                           |
| `/doctors`                    | internal admin  | Desktop/mobile smoke verified                                                                |
| `/feedback`                   | internal admin  | Desktop/mobile smoke verified                                                                |
| `/logs`                       | internal admin  | Desktop/mobile smoke verified                                                                |
| `/payment-processing`         | internal admin  | Desktop/mobile smoke verified                                                                |
| `/performance`                | internal admin  | Desktop/mobile smoke verified                                                                |
| `/pricing`                    | internal admin  | Desktop/mobile smoke verified                                                                |
| `/support`                    | internal admin  | Desktop/mobile smoke verified; `AppPageScaffold` hub with WhatsApp + inquiries tabs          |
| `/system-monitoring`          | internal admin  | Desktop/mobile smoke verified; light theme recheck                                           |
| `/users`                      | internal admin  | Desktop/mobile smoke verified; light theme recheck                                           |
| `/clinic`                     | internal clinic | Desktop/mobile smoke verified; role-gated locally                                            |
| `/clinic/create-doctor`       | internal clinic | Desktop/mobile smoke verified; role-gated locally                                            |
| `/clinic/create-receptionist` | internal clinic | Desktop/mobile smoke verified; role-gated locally                                            |
| `/clinic/team`                | internal clinic | Desktop/mobile smoke verified; role-gated locally                                            |
| `/dashboard/doctors`          | internal clinic | Desktop/mobile smoke verified                                                                |

## `apps/landing` Routes

| Route                 | Surface | QA status                                                  |
| --------------------- | ------- | ---------------------------------------------------------- |
| `/`                   | landing | Desktop/mobile smoke verified; desktop API stats 502 noted |
| `/404`                | landing | Desktop/mobile smoke verified                              |
| `/contact`            | landing | Desktop/mobile smoke verified                              |
| `/cookies`            | legal   | Desktop/mobile smoke verified                              |
| `/paper-to-cloud`     | landing | Desktop/mobile smoke verified                              |
| `/privacy`            | legal   | Desktop/mobile smoke verified                              |
| `/refund-policy`      | legal   | Desktop/mobile smoke verified                              |
| `/terms`              | legal   | Desktop/mobile smoke verified                              |
| `/trust`              | landing | Desktop/mobile smoke verified                              |
| `/whatsapp-workflows` | landing | Desktop/mobile smoke verified                              |


## Current workspace completion coverage (2026-10-12)

The dated matrix above is historical; route coverage for this continuation is taken from the current `apps/app/src/App.tsx` and `apps/internal/src/App.tsx` trees. The accepted ledger treatment applies at both protected workspace roots.

- Clinician: 52 static destinations including the Dashboard compatibility redirect, plus seven dynamic patient, encounter, prescription, invoice detail/edit and claim detail/edit patterns. The Upgrade compatibility route now opens the existing Plan & Billing settings workflow.
- Internal: all 18 protected destinations and Login. Audits assert page identity, the browser title and resolved theme at desktop, phone, tablet and laptop widths.
- Dynamic record checks exercise populated patient Records sections, the active encounter workspace, prescription identity, invoice identity and editable invoice items. Claims retains its canonical Coming soon state.
- Public, onboarding and patient/partner/lab portals retain their separate layouts; shared route loading remains bounded and named. Landing adoption work remains deferred.

See [current design QA](../../design-qa.md) for the findings, screenshots, passing-check counts and limits of verification, and [the completion plan](../superpowers/plans/2026-10-12-workspace-page-completion.md) for execution scope. This coverage does not claim every role/tier permutation or all clinical, messaging and payment lifecycle mutations.
