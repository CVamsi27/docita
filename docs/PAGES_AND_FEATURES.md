# Docita Application — Full Pages & Features Documentation

> Generated: 2026-06-19 · Status: Production-ready inventory
> Scope: `apps/app` (clinician), `apps/internal` (admin/staff)

This document is the single source of truth for every page in the Docita platform, the features each one offers, and the assessment of whether each page is required, can be merged with another, or should be redesigned.

---

## Executive Summary

| App | Total routes | Dynamic (`[id]`) | Placeholders / stubs | Issues found |
|---|---|---|---|---|
| `apps/app` | 47 | 7 | 4 (vaccines, referrals, pharmacy, upgrade) | 0 type errors, 0 lint errors |
| `apps/internal` | 16 | 0 | 0 | 0 type errors, 0 lint errors |

**Current state**: type-clean, lint-clean, and all 3,167 unit tests pass. The remaining work is largely feature parity and reducing placeholder surfaces before prod launch.

---

## Part 1 — apps/app (Clinician App)

### 1.1 Top-level & home

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/` | root | Landing redirect — internal admin → `/admin/login`, clinician → `/today` | OK | — |
| `/today` | Today | Daily command center: current patient, next queue, completed count, waiting, AI prompt | Required | Keep |
| `/dashboard` | Dashboard alias | Empty layout — only kept for backward compat | Redundant | **Remove** (route alias to `/today`) |
| `/billing-locked` | Billing locked | Shown when subscription is past grace | Required | Keep — add in-page payment CTA |
| `/upgrade` | Upgrade shim | Only loading.tsx + error.tsx; resolves to settings | Redundant | **Remove** — redirect to `/settings?tab=subscription` |
| `/login` | Login | Email/OTP login | Required | Keep |
| `/forgot-password` | Forgot password | Reset password flow | Required | Keep |
| `/reset-password` | Reset password | Token-based reset | Required | Keep |
| `/book/[referralCode]` | Public booking | Public-facing appointment booking | Required | Keep |
| `/mobile-upload/[id]` | Public mobile upload | Document upload from phone | Required | Keep |
| `/e2e-session-seed` | E2E test helper | Test-only session seed | OK | Keep (test only) |

### 1.2 Clinical core

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/appointments` | Appointments | Calendar/slots, requests, delays, follow-ups | Required | Keep — add conflict detection, recurring setup |
| `/consultation` | Consultation dashboard | OPD queue, next-up patient, vitals, billing launch | Required | Keep — add batch vitals, wait-time estimate |
| `/consultation/[id]` | Active consultation | SOAP + specialty exams + prescriptions + investigations | Required | Keep — add auto-save indicator, voice-to-text |
| `/patients` | Patients list | Searchable, sortable, paginated list | Required | Keep — add bulk actions, recent shortcut |
| `/patients/[id]` | Patient detail | Face sheet with 5 tabs (Summary / Visits / Records / Billing / Communication) | Required | Keep — unify into a single timeline |
| `/coding-queue` | Coding queue | Review completed visits awaiting ICD-10/CPT coding | Required | Keep — now wired to dashboard alerts (post-fix) |
| `/follow-ups` | Follow-ups worklist | Overdue / Today / Upcoming / All open | Required | Keep — add SMS fallback, auto-close rules |
| `/daybook` | Daybook | Cash reconciliation / day-end report | Required | Keep |
| `/desk/collect-payment` | Payment desk | Cash/UPI/Card collection against open invoices | Required | Keep — add split payment, digital signature |
| `/desk/floor` | Desk floor | Redirect → `/desk/collect-payment` | OK | Keep redirect |
| `/inbox` | Inbox | Notifications, follow-ups, join requests, coding queue | Required | Keep — add "mark all as read" |

### 1.3 Specialty

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/specialty` | Specialty index | Redirect → `/specialty/dental-charts` | OK | Keep redirect |
| `/specialty/dental-charts` | Dental charts | Per-patient dental charting | Required | Keep |
| `/hospital/beds` | Hospital beds | Bed/ward management, IPD admission | Required | Keep |

### 1.4 Documents & records

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/documents` | Documents archive | Cross-patient document library | Required | Keep |
| `/prescriptions` | Prescriptions list | All prescriptions, search, filter, PDF | Required | Keep — add drug-allergy alert, formulary check |
| `/prescriptions/[id]` | Prescription view | Read-only printable view | Required | Keep |
| `/lab-tests` | Lab tests | Lab orders, catalog, results, payment verification | Required | Keep — add reference range viz, critical-value flag |
| `/invoices` | Invoices list | All invoices, status filter, PDF | Required | Keep — add payment reminder automation |
| `/invoices/new` | New invoice | Build new invoice | Required | Keep |
| `/invoices/[id]` | Invoice detail | View, payment activity, share | Required | Keep |
| `/invoices/[id]/edit` | Edit invoice | Edit DRAFT invoice | Required | Keep |
| `/insurance-claims` | Insurance claims list | Pre-auth and reimbursement tracking | Required | Keep — add auto-prefill from invoice |
| `/insurance-claims/new` | New claim | Create claim | Required | Keep |
| `/insurance-claims/[id]` | Claim detail | View, status workflow, document attach | Required | Keep |
| `/insurance-claims/[id]/edit` | Edit claim | Edit DRAFT claim | Required | Keep |

### 1.5 Inventory / pharmacy

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/inventory` | Inventory | Stock tracking, low-stock alerts, movements | Required | Keep — add auto-reorder, vendor management, expiry alerts |
| `/pharmacy` | Pharmacy | **MISSING** — route exists in route-meta but no page.tsx | Placeholder | **Implement** dispense workflow OR remove from route-meta |
| `/vaccines` | Vaccines | Stub with empty state | Placeholder | **Hide from nav** (done) — remove from route-meta until backend ready |
| `/referrals` | Referrals | Stub with empty state | Placeholder | **Hide from nav** — remove from route-meta until backend ready |

### 1.6 Reports / Analytics / AI

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/analytics` | Analytics | Disease trends, CPT revenue, compliance | Required | Keep — add benchmarking, cohort analysis |
| `/reports` | Reports hub | 2-card hub → analytics + daybook | Redundant | **Demote to sidebar section** or **promote** to real reports hub |
| `/ai-assistant` | AI Assistant | Prescription + diagnosis assist | Required | Keep — Insights/Smart tasks tabs are "Soon" placeholders |
| `/import` | Import hub | Excel / OCR / Bulk import entry cards | Required | Keep |
| `/import/ocr` | OCR scanner | AI OCR for handwritten notes | Required | Keep |
| `/import/excel` | Excel import | Smart column mapping, batch import | Required | Keep |

### 1.7 Communication

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/whatsapp` | WhatsApp operations | Sent / Campaigns / Templates / Delivery | Required | Keep — add HSM template tester/sandbox |

### 1.8 Settings & profile

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/settings` | Settings mega-page | 15+ tabs (General / Members / Subscription / Availability / Queue / Prescriptions / Labs / ABDM / Reminders / Notifications / Security / Appearance / Leave / Doctor profile / Branding / Danger zone) | Required | Keep |
| `/settings/whatsapp-sender` | WhatsApp sender config | Clinic WhatsApp sender identity + templates | Required | Keep |
| `/settings/compliance` | Compliance | DPDP/ABDM consent, retention, audit readiness | Required | Keep |
| `/settings/compliance/consent-template` | Consent template editor | Edit consent templates | Required | Keep |
| `/settings/team` | Team management | Staff (doctors, receptionists, nurses) and roles | Required | Keep |
| `/settings/team/join-requests` | Pending join requests | Approve/reject invitations | Required | Keep |
| `/profile` | Account profile | User's own account (name, email, password) | Required | Keep |
| `/help` | Help center | **Static placeholder** — 5 hardcoded categories, 3 FAQs | Placeholder | **Replace with real KB** OR remove |
| `/templates` | Templates | Redirect → `/settings?tab=prescriptions` | OK | Keep redirect |

---

## Part 2 — apps/internal (Admin / Staff Dashboard)

| Route | Page | Purpose | Status | Action |
|---|---|---|---|---|
| `/dashboard` | Overview | All-facility rollup: facilities, doctors, patients, invoices, prescriptions | Required | Keep — add health-score per facility |
| `/analytics` | Internal analytics | Cross-clinic analytics: billing, MRR, subscription, growth | Required | Keep — add cohort retention, funnel analysis |
| `/billing` | Billing dashboard | All clinic subscriptions, risk summary, grace period | Required | Keep — add dunning workflow |
| `/enterprise-contracts` | Enterprise contracts | Enterprise tier contracts: true-up, prepay, members, alerts | Required | Keep — add PDF export |
| `/payment-processing` | Payment processing | Record subscription payments, tier changes, add-ons | Required | Keep |
| `/pricing` | Pricing management | Manage tier pricing + facility-specific offers | Required | Keep |
| `/users` | Team members | All users across facilities | Required | Keep — add impersonation |
| `/doctors` | Doctors | Doctor profiles, specializations, credentials | Required | Keep |
| `/admins` | Clinic admins | Manage clinic administrators and admin doctors | Required | Keep — add audit log of admin actions |
| `/feedback` | Feedback portal | User feedback from all clinics | Required | Keep — add SLA tracking, assignment |
| `/support` | Support hub | WhatsApp conversations + contact form inquiries | Required | Keep — add SLA timer |
| `/broadcasts` | Broadcast messages | CSV upload + WhatsApp campaign | Required | Keep — add A/B templates, scheduled sends |
| `/audits` | Audit logs | Tenant-scoped activity records (hardcoded `limit=100`) | Required | Keep — **add filter UI** (date, actor, resource) |
| `/logs` | System logs | System events and errors | Required | Keep — add log export, retention policy |
| `/system-monitoring` | System monitoring | Live health, performance, request telemetry (8 tabs) | Required | Keep — add alert rules, Slack/PagerDuty |
| `/performance` | Performance metrics | Live runtime, DB, request metrics | Required | Keep — add historical trending |

---

## Part 3 — Pages to Remove / Merge / Hide

### 3.1 Redundant or alias routes (remove)
1. `/dashboard` — only has layout.tsx, no UI. Remove or alias to `/today`.
2. `/upgrade` — only has loading.tsx + error.tsx. Resolves to settings. Remove.

### 3.2 Placeholder pages (hide from nav)
1. `/vaccines` — empty state. **Removed from sidebar** (nav-config-sections.tsx).
2. `/referrals` — empty state. Not in nav but in route-meta. Remove from route-meta.
3. `/pharmacy` — no page.tsx. Remove from route-meta until implemented.

### 3.3 Pages that could be merged
1. `/reports` is just a 2-card hub → either demote to a sidebar section or promote to a real cross-feature reports hub.
2. `/inbox` could subsume `/follow-ups` and `/coding-queue` as worklist tabs.
3. `/dashboard` should be removed in favor of `/today`.

---

## Part 4 — Missing Pages for a Healthcare App (Roadmap)

### 4.1 Telemedicine (high impact, 2026 standard)
- **Telemedicine workspace** — video call + screen share + vitals overlay
- **Patient virtual waiting room** — separate surface for online consults

### 4.2 E-prescription / Digital pharmacy
- **Pharmacy dispensing workspace** — dispense against prescription, controlled substance tracking, schedule H/H1
- **Drug-allergy / interaction alert** — real-time check during composition
- **Formulary / price preview** at the prescription step

### 4.3 Lab results
- **Patient-facing lab results view** — PDF + trend charts
- **Reference range visualization** — HbA1c over time, lipid panel trends

### 4.4 Imaging / Radiology
- **Imaging module** — DICOM upload, study tracking, radiology report workflow

### 4.5 Other clinical
- **Operative notes / surgical notes** workspace
- **Discharge summary** for IPD
- **Antenatal care (ANC) workflow** for OB-GYN
- **Immunization register** at the clinic level
- **Growth chart standalone page** (cross-patient)
- **Clinical photographs** for dermatology
- **Nursing notes / chart** for IPD
- **Structured handover / shift change** notes
- **Patient consent capture** at point-of-care
- **Clinical alerts dashboard** — NEWS2 / sepsis scoring

### 4.6 Operations / front desk
- **Queue token display** / TV dashboard
- **Patient self-check-in** flow
- **Appointment SMS gateway**

### 4.7 Admin / internal
- **Role-based access control editor** in internal app
- **Compliance dashboard** in internal app
- **Data retention enforcement** tool
- **User impersonation** with audit trail
- **Feature flag management UI**

---

## Part 5 — Missing Features on Existing Pages (High Priority)

| Page | Missing feature | Impact |
|---|---|---|
| `/today` | "All upcoming today" timeline + integrated checklist | High |
| `/patients/[id]` | Unified timeline aggregation (history fragmented across tabs) | High |
| `/consultation/[id]` | Auto-save status indicator + voice-to-text for subjective notes | High |
| `/coding-queue` | Batch-code many visits, ICD-to-CPT mapping suggestions | Medium |
| `/prescriptions` | Drug-allergy alert, formulary check, cost preview | High |
| `/lab-tests` | Reference range visualization, critical-value flag | High |
| `/inventory` | Auto-reorder, vendor management, expiry alerts | Medium |
| `/help` | Replace static placeholder with real KB (article list, search, detail) | High |
| `/audits` (internal) | Filter UI: date range, actor, resource, status | High |

---

## Part 6 — UI/UX Standard Compliance

The repo has a strong design system in `docs/ui/UI_UX_STANDARD_2026.md` and `packages/ui/src/styles/globals.css`. Every page is built from `@workspace/ui` primitives. The compliance status:

- AppPageScaffold: ✅ consistent across protected routes
- PageHeader: ✅ consistent
- DataState: ✅ used for loading/error/empty
- FeatureGate: ✅ used for tier-gated surfaces
- Component sourcing order: ✅ (workspace/ui → feature → local)

The remaining UI gaps are content-level (placeholder pages) and the 5 specific improvements noted in the analysis report.

---

## Part 7 — Verification Status

| Check | Status |
|---|---|
| `pnpm --filter @docita/app run check-types` | ✅ pass |
| `pnpm --filter @docita/api run check-types` | ✅ pass |
| `pnpm --filter @docita/internal run check-types` | ✅ pass |
| `pnpm --filter @docita/worker run check-types` | ✅ pass |
| `pnpm --filter @docita/landing run check-types` | ✅ pass |
| `pnpm lint` (all apps) | ✅ pass |
| `pnpm --filter @docita/app run test` | ✅ 1002/1002 |
| `pnpm --filter @docita/api run test` | ✅ 2165/2165 |

**Production readiness**: the repo is type-clean, lint-clean, and all tests pass. The remaining work is feature parity (telemedicine, pharmacy, imaging) and removing the 4 placeholder surfaces from the navigation / route-meta before launch.
