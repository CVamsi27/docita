# Docita Application — Pages & Features (Vite apps)

> **Generated: 2026-08-02** · Scope: `apps/app` (clinician app) + `apps/internal` (admin/staff portal)
> This regenerated inventory supersedes the 2026-06-19 Next.js version (see the archive note at the bottom).
> The **authoritative port status** (per-feature COMPLETE/SHELL/MISSING, phases, gates) lives in
> [`PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md); this document is the route/feature map.

## Executive Summary

| App | Routes | Feature dirs | Unit tests | E2E spec files | Production build |
|---|---|---|---|---|---|
| `apps/app` | 95 (incl. settings/portal sub-routes) | 44 | 653 passing (122 files) | 45 spec files (~1,048 tests) | green (`build` + `build:cloudflare`) |
| `apps/internal` | 19 | 17 | 52 passing | 3 spec files (44 tests) | green (`build` + `build:cloudflare`) |

Feature port state (2026-08-02, from the porting plan): **38/46 COMPLETE, 8 SHELL, 3 MISSING**. The remaining
long tail is tracked phase-by-phase in [`PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md) §Phases 6/9.

---

## Part 1 — apps/app (Clinician App)

### 1.1 Auth & account

| Route | Page / feature | Notes |
|---|---|---|
| `/login` | `auth/AuthPageContainer` | Login (email/OTP, mobile) |
| `/forgot-password` | `auth/pages/forgot-password` | |
| `/reset-password` | `auth/pages/reset-password` | |
| `/verify-email` | `verify-email` | |
| `/verify-email-sent` | `verify-email` | |
| `/verify-email/verified` | `verify-email` | |
| `/profile` | `profile` | Thin surface |
| `/help` | `help` | |

### 1.2 Setup & onboarding

| Route | Page / feature | Notes |
|---|---|---|
| `/choose-path` | `setup/pages/choose-path` | New clinic vs join existing |
| `/clinic-selection` | `setup/pages/clinic-selection-page` | |
| `/join-clinic` | `setup/pages/join-clinic-page` | Join-code flow |
| `/join-request-status` | `setup/pages/join-request-status-page` | |
| `/onboarding` | `setup/pages/onboarding-page` | Multi-step onboarding incl. compliance + SLA signature |
| `/verify-doctor` | `setup/pages/verify-doctor-page` | Registration-number verification |
| `/billing-locked` | `billing-locked` | Small locked surface |
| `/upgrade` | `upgrade` | Plan upgrade surface |
| `/upload-signature/:token` | `upload-signature` | Public signature upload (token link) |
| `/upload-signature/onboarding` | `upload-signature` | Onboarding SLA signature |

### 1.3 Clinical core (protected)

| Route | Page / feature | Notes |
|---|---|---|
| `/today` | `today` + `dashboard/components/today/*` | Today's schedule, queue, doctor cards, advisor rail, referral share |
| `/dashboard` | `dashboard` | Overview, stats, activity, follow-ups, shortcuts |
| `/consultation` | `consultation` | Consultation list |
| `/consultation/:id` | `consultation` | Consultation detail (sections: exams, prescriptions, billing, history) |
| `/coding-queue` | `medical-coding` | ICD-10 / procedure coding queue |
| `/appointments` | `appointments` | Calendar (day/week), delay banner/dialog, OPD slip download |
| `/patients` | `patients` | Patient list |
| `/patients/:id` | `patients` | Patient detail (history, allergies, documents) |
| `/prescriptions` | `prescriptions` | Prescription list + filters |
| `/prescriptions/:id` | `prescriptions` | Prescription detail |
| `/daybook` | `daybook` | End-of-day cash reconciliation |
| `/desk/floor` | `desk` | Front-desk OPD floor / token queue |
| `/desk/collect-payment` | `desk` | |
| `/hospital/beds` | `ipd` | Ward/bed overview |
| `/specialty` | `consultation/components/specialty` | Specialty section index |
| `/specialty/dental-charts` | `consultation/components/specialty` | Dental charting |
| `/reports` | `analytics` | |

### 1.4 Billing & revenue

| Route | Page / feature | Notes |
|---|---|---|
| `/invoices` | `invoices` | Invoice list |
| `/invoices/new` | `invoices` | Create invoice |
| `/invoices/:id` | `invoices` | Invoice detail |
| `/invoices/:id/edit` | `invoices` | Edit invoice |
| `/insurance-claims` | `insurance-claims` | Claims list |
| `/insurance-claims/new` | `insurance-claims` | |
| `/insurance-claims/:id` | `insurance-claims` | |
| `/insurance-claims/:id/edit` | `insurance-claims` | |
| `/lab-tests` | `lab-tests` | Orders + catalog |

### 1.5 Operations

| Route | Page / feature | Notes |
|---|---|---|
| `/inventory` | `inventory` | Inventory + item details |
| `/pharmacy` | `pharmacy` | Thin surface |
| `/documents` | `documents` | Document list |
| `/import` | `imports` | Bulk-import wizard (excel/ocr placeholder routes dropped 2026-08-02) |
| `/follow-ups` | `follow-ups` | |
| `/referrals` | `referrals` | Thin surface |

### 1.6 Communication & AI

| Route | Page / feature | Notes |
|---|---|---|
| `/whatsapp` | `whatsapp` | Broadcasts / delivery view |
| `/inbox` | `inbox` | |
| `/templates` | `templates` | Thin surface (settings also has `/settings/templates`) |
| `/ai-assistant` | `ai-assistant` | |

### 1.7 Analytics

| Route | Page / feature | Notes |
|---|---|---|
| `/analytics` | `analytics` | Charts, advanced metrics |

### 1.8 Settings & profile

| Route | Feature | Notes |
|---|---|---|
| `/settings` | `settings` | Index |
| `/settings/account` | `settings` | Personal info |
| `/settings/appearance` | `settings` | Theme |
| `/settings/availability` | `settings` | |
| `/settings/clinic` | `settings` | Clinic profile |
| `/settings/clinical` | `settings` | Prescription defaults, OPD slip settings |
| `/settings/compliance` | `settings` | |
| `/settings/compliance/consent-template` | `settings` | Consent templates |
| `/settings/danger-zone` | `settings` | |
| `/settings/doctor-profile` | `settings` | |
| `/settings/leave` | `settings` | |
| `/settings/notifications` | `settings` | |
| `/settings/queue` | `settings` | |
| `/settings/security` | `settings` | |
| `/settings/team` | `settings` | Team management |
| `/settings/team/join-requests` | `settings` | Join-request review |
| `/settings/templates` | `settings` | |
| `/settings/whatsapp-sender` | `settings` | |

### 1.9 Portals & public surfaces

| Route | Feature | Notes |
|---|---|---|
| `/portal` + `/portal/login` | `patient-portal` | Patient portal shell |
| `/portal/appointments` · `/portal/billing` · `/portal/history` · `/portal/medications` · `/portal/metrics` · `/portal/prescriptions` · `/portal/profile` · `/portal/profile/consent-form` | `patient-portal` | Portal views |
| `/book/:referralCode` | `public-booking` | Public booking page |
| `/partner` + `/partner/login` · `/partner/dashboard` · `/partner/banking` · `/partner/payouts` · `/partner/referrals` · `/partner/share` | `referral-partner` | Partner portal |
| `/lab-portal` + `/lab-portal/login` | `lab-portal` | Lab portal |
| `/mobile-upload/:id` | `mobile-upload` | Mobile upload |

### 1.10 Tools / test helpers

| Route | Feature | Notes |
|---|---|---|
| `/tools` · `/visual-test/:fixture` | `tools` | dev-tools — **intentional SHELL** (Next fixtures not ported; 5 visual E2E specs dropped accordingly) |
| `/e2e-session-seed` | `tools` | E2E session seeding |
| `/` | — | Redirects |

### Feature directories (44)

`ai-assistant` `analytics` `appointments` `auth` `billing-locked` `consultation` `dashboard`
`daybook` `desk` `dialogs` `documents` `errors` `follow-ups` `help` `imports` `inbox`
`insurance-claims` `inventory` `invoices` `ipd` `lab-portal` `lab-tests` `legal`
`medical-coding` `medical-documents` `mobile-upload` `patient-portal` `patients` `pharmacy`
`prescriptions` `profile` `public-booking` `referral-partner` `referrals` `search` `settings`
`setup` `subscription` `templates` `today` `tools` `upgrade` `upload-signature` `verify-email`
`whatsapp`

---

## Part 2 — apps/internal (Admin / Staff Dashboard)

| Route | Page / feature |
|---|---|
| `/login` | `components/layout/login-page` |
| `/dashboard` | `dashboard` |
| `/users` | `users` |
| `/doctors` | `doctors` |
| `/billing` | `billing` |
| `/pricing` | `pricing` |
| `/analytics` | `analytics` |
| `/support` | `support` |
| `/payment-processing` | `payment-processing` |
| `/broadcasts` | `broadcasts` |
| `/audits` | `audits` |
| `/referrals` | `referrals` |
| `/enterprise-contracts` | `enterprise-contracts` |
| `/admins` | `admins` |
| `/feedback` | `feedback` |
| `/logs` | `logs` |
| `/performance` | `performance` |
| `/system-monitoring` | `system-monitoring` |
| `/` | Redirect to `/dashboard` |

Feature directories (17): `admins` `analytics` `audits` `billing` `broadcasts` `dashboard`
`doctors` `enterprise-contracts` `feedback` `logs` `payment-processing` `performance`
`pricing` `referrals` `support` `system-monitoring` `users`

---

## Part 3 — Port status & thin surfaces

- **Authoritative per-feature status** (COMPLETE / SHELL / MISSING by phase): [`PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md) — 2026-08-02 state is **38/46 COMPLETE, 8 SHELL, 3 MISSING**.
- **Thin surfaces in the live tree** (1–2 production files; not necessarily shells — e.g. `today` is a thin page composing fully-ported dashboard sections): `billing-locked`, `errors` (not-found pages), `pharmacy`, `profile`, `referrals`, `templates`, `tools` (intentional dev-tools shell), `upgrade`.
- **Dropped at port-or-drop review (2026-08-02)**: `imports/excel`, `imports/ocr`, `feedback` (as a client feature; internal keeps an admin feedback page), `guided-tour`. Their placeholder routes were removed.
- **Dead code removed**: the Next-era apps are staged for deletion on this branch; build-blocking migration residue in `packages/data-access` (speculative blob-download hooks) was removed 2026-08-02 (REPO_GAPS §J item 11).

---

## Part 4 — Verification status (2026-08-02)

| Gate | State |
|---|---|
| `pnpm verify:standard` (full ~90-check gate) | exit 0 |
| `pnpm check:circular:enforce` | 0 cycles |
| `pnpm knip` | exit 0 |
| app unit tests | 653/653 (122 files) |
| internal unit tests | 52/52 |
| `pnpm check:i18next-parity` | en 1,885 = hi 1,885 leaves (exact parity) |
| Production builds (`build` + `build:cloudflare`) | both apps green |
| E2E (Playwright) | app 45 spec files / ~1,048 tests; internal 3 spec files / 44 tests — needs a CI run with Postgres to close checklist item 3 |

---

## Archive note

The previous **2026-06-19 Next.js inventory** (apps/app 47 routes, apps/internal 16 routes; Parts 3–7: remove/merge/hide proposals, missing-pages roadmap, UI/UX compliance, verification) described the deleted Next.js apps. Its still-valid product thinking lives on in:

- [`docs/FUTURE_FEATURE_REQUIREMENTS.md`](FUTURE_FEATURE_REQUIREMENTS.md) — missing-pages roadmap (telemedicine, e-prescription, imaging, etc.)
- [`docs/ui/UI_UX_STANDARD_2026.md`](docs/ui/UI_UX_STANDARD_2026.md) — the authoritative UI/UX contract
- [`docs/PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md) — port phases, decisions, and the cutover checklist
