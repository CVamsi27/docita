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
- `apps/app`: auth/root/setup smoke covered `/login`, `/`, `/dashboard`, `/appointments`, `/patients`, and `/choose-path` in the unauthenticated local state. Result: auth shell and redirects rendered without overflow; fully authenticated protected and patient-portal states require seeded auth/backend state beyond this UI-only pass. `pnpm audit:app` covered the configured protected visual/a11y routes.

## `apps/app` Routes

| Route | Surface | QA status |
| --- | --- | --- |
| `/` | app root | Browser smoke: unauthenticated redirect shell verified |
| `/forgot-password` | auth | Shared auth shell pass + app audit |
| `/login` | auth | Desktop/mobile screenshot verified |
| `/reset-password` | auth | Shared auth shell pass + app audit |
| `/ai-assistant` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/analytics` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/appointments` | protected app | Browser smoke: auth-gated route verified |
| `/coding-queue` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/consultation` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/consultation/[id]` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/dashboard` | protected app | Browser smoke + app audit |
| `/documents` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/hospital/beds` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/import` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/import/excel` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/import/ocr` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/inventory` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/invoices` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/invoices/new` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/invoices/[id]` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/invoices/[id]/edit` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/lab-tests` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/patients` | protected app | Browser smoke + app audit |
| `/patients/[id]` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/patients/[id]/history` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/prescriptions` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/prescriptions/[id]` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/profile` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/settings` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/settings/compliance` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/settings/team/join-requests` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/specialty/dental-charts` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/upgrade` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/whatsapp` | protected app | Shared app shell pass + app audit; auth-gated locally |
| `/choose-path` | setup | Browser smoke: unauthenticated redirect state verified |
| `/clinic-selection` | setup | Shared setup shell pass + app audit |
| `/join-clinic` | setup | Shared setup shell pass + app audit |
| `/join-request-status` | setup | Shared setup shell pass + app audit |
| `/onboarding` | setup | Shared setup shell pass + app audit |
| `/upload-signature/[token]` | setup/tool | Shared tool shell pass + app audit |
| `/upload-signature/onboarding` | setup/tool | Shared tool shell pass + app audit |
| `/verify-doctor` | setup | Shared setup shell pass + app audit |
| `/verify-email-sent` | setup | Shared setup shell pass + app audit |
| `/verify-email` | setup | Shared setup shell pass + app audit |
| `/verify-email/verified` | setup | Shared setup shell pass + app audit |
| `/mobile-upload/[id]` | tool | Shared tool shell pass + app audit |
| `/visual-test/doctor-workflow` | tool | Shared tool shell pass + app audit |
| `/visual-test/stats-card` | tool | Shared tool shell pass + app audit |
| `/visual-test/status-badge` | tool | Shared tool shell pass + app audit |
| `/visual-test/ui-contract` | tool | Shared tool shell pass + app audit |
| `/portal` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/login` | patient portal | Shared portal auth pass + app audit |
| `/portal/appointments` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/billing` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/history` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/medications` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/metrics` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/prescriptions` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/profile` | patient portal | Shared portal shell pass + app audit; auth-gated locally |
| `/portal/profile/consent-form` | patient portal | Shared portal shell pass + app audit; auth-gated locally |

## `apps/internal` Routes

| Route | Surface | QA status |
| --- | --- | --- |
| `/` | internal root | Desktop/mobile smoke verified |
| `/admins` | internal admin | Desktop/mobile smoke verified |
| `/analytics` | internal admin | Desktop/mobile smoke verified |
| `/audits` | internal admin | Desktop/mobile smoke verified |
| `/billing` | internal admin | Desktop/mobile smoke verified; light theme recheck |
| `/dashboard` | internal admin | Desktop/mobile smoke verified; light theme recheck |
| `/doctors` | internal admin | Desktop/mobile smoke verified |
| `/feedback` | internal admin | Desktop/mobile smoke verified |
| `/logs` | internal admin | Desktop/mobile smoke verified |
| `/payment-processing` | internal admin | Desktop/mobile smoke verified |
| `/performance` | internal admin | Desktop/mobile smoke verified |
| `/pricing` | internal admin | Desktop/mobile smoke verified |
| `/support` | internal admin | Desktop/mobile smoke verified |
| `/system-monitoring` | internal admin | Desktop/mobile smoke verified; light theme recheck |
| `/users` | internal admin | Desktop/mobile smoke verified; light theme recheck |
| `/clinic` | internal clinic | Desktop/mobile smoke verified; role-gated locally |
| `/clinic/create-doctor` | internal clinic | Desktop/mobile smoke verified; role-gated locally |
| `/clinic/create-receptionist` | internal clinic | Desktop/mobile smoke verified; role-gated locally |
| `/clinic/team` | internal clinic | Desktop/mobile smoke verified; role-gated locally |
| `/dashboard/doctors` | internal clinic | Desktop/mobile smoke verified |

## `apps/landing` Routes

| Route | Surface | QA status |
| --- | --- | --- |
| `/` | landing | Desktop/mobile smoke verified; desktop API stats 502 noted |
| `/404` | landing | Desktop/mobile smoke verified |
| `/contact` | landing | Desktop/mobile smoke verified |
| `/cookies` | legal | Desktop/mobile smoke verified |
| `/paper-to-cloud` | landing | Desktop/mobile smoke verified |
| `/privacy` | legal | Desktop/mobile smoke verified |
| `/refund-policy` | legal | Desktop/mobile smoke verified |
| `/terms` | legal | Desktop/mobile smoke verified |
| `/trust` | landing | Desktop/mobile smoke verified |
| `/whatsapp-workflows` | landing | Desktop/mobile smoke verified |
