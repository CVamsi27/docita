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

## `apps/app` Routes

| Route                                   | Surface        | QA status                                                                                       |
| --------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `/`                                     | app root       | Browser smoke: unauthenticated redirect shell verified                                          |
| `/forgot-password`                      | auth           | Mobile Playwright overflow (390px) + app audit                                                  |
| `/login`                                | auth           | Mobile Playwright overflow (390px) + multi-device form spec                                     |
| `/reset-password`                       | auth           | Shared auth shell pass + app audit                                                              |
| `/ai-assistant`                         | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/analytics`                            | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/appointments`                         | protected app  | Browser smoke + mobile Playwright overflow (390px)                                              |
| `/billing-locked`                       | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/coding-queue`                         | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/consultation`                         | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/consultation/[id]`                    | protected app  | Mobile Playwright overflow (390px) + app audit; auth-gated locally                              |
| `/dashboard`                            | protected app  | Browser smoke + app audit                                                                       |
| `/daybook`                              | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/desk/collect-payment`                 | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/desk/floor`                           | protected app  | Shared app shell pass + app audit; hospital-gated locally                                       |
| `/documents`                            | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/hospital/beds`                        | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/import`                               | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/import/excel`                         | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/import/ocr`                           | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/inventory`                            | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/invoices`                             | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/invoices/new`                         | protected app  | Mobile Playwright overflow (390px) + app audit; auth-gated locally                              |
| `/invoices/[id]`                        | protected app  | Mobile Playwright overflow (390px) when invoice fixture exists                                  |
| `/invoices/[id]/edit`                   | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/insurance-claims`                     | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/insurance-claims/new`                 | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/insurance-claims/[id]`                | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/insurance-claims/[id]/edit`           | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/lab-tests`                            | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/patients`                             | protected app  | Browser smoke + mobile Playwright overflow (390px)                                              |
| `/patients/[id]`                        | protected app  | Mobile Playwright overflow (390px) + app audit; auth-gated locally                              |
| `/prescriptions`                        | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/prescriptions/[id]`                   | protected app  | Mobile Playwright overflow (390px) when prescription exists                                     |
| `/profile`                              | protected app  | Mobile Playwright overflow (390px) + app audit                                                  |
| `/referrals`                            | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/settings`                             | protected app  | Mobile Playwright overflow (390px) + app audit; auth-gated locally                              |
| `/settings/compliance`                  | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/settings/compliance/consent-template` | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/settings/team/join-requests`          | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/settings/whatsapp-sender`             | protected app  | Admin-only route policy + app audit                                                             |
| `/specialty`                            | protected app  | Conditional specialty redirect                                                                  |
| `/specialty/dental-charts`              | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/templates`                            | protected app  | Shared app shell pass + app audit; auth-gated locally                                           |
| `/today`                                | protected app  | Nav smoke + mobile Playwright overflow (390px)                                                  |
| `/upgrade`                              | protected app  | Redirects to `/settings?tab=subscription`; treat billing UX via Settings subscription tab       |
| `/vaccines`                             | protected app  | Nav smoke + app audit; auth-gated locally                                                       |
| `/whatsapp`                             | protected app  | Operational hub: conversations, campaigns, templates, delivery; mobile route matrix + app audit |
| `/choose-path`                          | setup          | Browser smoke: unauthenticated redirect state verified                                          |

| `/join-clinic`                          | setup          | Shared setup shell pass + app audit                                                             |
| `/join-request-status`                  | setup          | Shared setup shell pass + app audit                                                             |
| `/onboarding`                           | setup          | Shared setup shell pass + app audit                                                             |
| `/upload-signature/[token]`             | setup/tool     | Shared tool shell pass + app audit                                                              |
| `/upload-signature/onboarding`          | setup/tool     | Shared tool shell pass + app audit                                                              |
| `/verify-doctor`                        | setup          | Shared setup shell pass + app audit                                                             |
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
| `/analytics`                  | internal admin  | Desktop/mobile smoke verified                                                                |
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
