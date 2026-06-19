# Page Audit: Docita App

**Date:** 2026-06-19
**Scope:** Every route, settings tab, and significant feature across the Docita application (clinic staff app, patient portal, lab portal, public/booking, setup/auth, and developer-only routes).
**Method:** Routes enumerated directly from the Next.js App Router (`apps/app/app`), settings tabs from `features/settings/constants.ts`, navigation membership from `shared/components/navigation/nav-config*.ts`, and access model from `packages/db/prisma/schema.prisma`. Counts in this doc reflect the source of truth on branch `fix/UI-issues`, not earlier estimates.

> **What changed in this revision (v2):** This audit was expanded to (a) correct the route inventory — the codebase has **76 page files**, including several customer-facing and developer routes the prior pass missed; (b) add an **RBAC + subscription-tier gating** layer per page; (c) add a **navigation / information-architecture** analysis (in-nav vs hidden); (d) re-scope recommendations (notably: `/settings/team/join-requests` already exists, so the earlier "add a Team route" item is downgraded to "extend existing"); and (e) attach **effort / impact / priority** scoring and a **phased roadmap**.

> **Implementation status (2026-06-19, branch `fix/UI-issues`):**
> - **✅ Shipped & verified** (typecheck + unit tests green): R3 env-gate `/e2e-session-seed`; nav access-coverage fix (`/ai-assistant` accessTarget); **M5** OPD-slip→Prescriptions tab; **R1** remove Help tab; **M6** WhatsApp-sender dedupe; **R2** feature-gated `/coding-queue` nav; **M2** referrals moved to a per-patient Records sub-tab + de-navved stub.
> - **✅ Already done in code** (no change needed): **M7** compliance dedupe, join-requests dedupe (`LEGACY_TAB_REDIRECTS`), ABDM `comingSoon`, **M3** templates already live in settings.
> - **✋ Declined with reason:** **M4** profile→settings — profile is universal-access (incl. NURSE) but settings isn't, so the merge would strand NURSE or over-broaden settings; `/profile` stays its own page (content extracted to a shared `ProfileAccountSettings` panel).
> - **⏸ Deferred** (entangled, not low-risk): **M1** desk→tabs (UX call + e2e churn); **A1** `/reports` route (needs a cross-package `PAGE_REPORTS` target with OR-gating, and both source pages are self-scaffolded tabbed views — double-wrap); sectioned sidebar (T2.6) is coupled to `NavSectionId` typing + nav-order persistence + customize sheet + mobile nav.
> - **📋 Planned, not started** (large / backend-blocked / needs design): **A2′** extend `/settings/team/*`, all of **Phase 3** (9 features; referrals/lab-results need backend) and **Phase 4** (6 redesigns). Referrals backend (`PatientReferral` model + API domain) is schema-locked and must be migrated before the M2 placeholder becomes functional.

---

## 0. Reference Models (read this first)

These two enums drive almost every "is this page required / who sees it" decision below.

### 0.1 Roles (`enum Role`)

| Role | Who | Primary surfaces |
|---|---|---|
| `DOCTOR` | Treating physician | Consultation workspace, prescriptions, today, patients |
| `ADMIN_DOCTOR` | Doctor who also owns/admins the clinic | All clinical + all admin/settings |
| `ADMIN` | Practice manager / owner (non-clinical) | Settings, billing, team, analytics, daybook |
| `NURSE` | Nursing / vitals / prep | Consultation prep, vaccines, vitals, queue |
| `RECEPTIONIST` | Front desk | Appointments, desk/collect-payment, invoices, inbox |
| `LAB` | Lab technician | Lab portal only |
| `PATIENT` | Patient | Patient portal only |
| `INTERNAL` | Docita staff/superadmin | Internal app (separate `apps/internal`), not in scope here |

### 0.2 Plans (`enum ClinicTier` × `enum PlanMode`)

- **Billed tiers (5):** `STARTER` → `ESSENTIAL` → `PROFESSIONAL` → `HOSPITAL` → `ENTERPRISE`. Source of truth: `packages/types/src/billing/tier.ts` (`tierSchema`, `BILLED_TIERS`, `PUBLISHED_PLAN_LADDER`).
- **`INTELLIGENCE` add-on:** a 6th value on the `Tier` enum but **not a billed tier** — it's an add-on checked via a separate `hasIntelligence` flag, never via a raw `>=` tier comparison. Don't treat it as a rung on the ladder.
- **Tier numeric ranks** (`Tier` enum): `STARTER=0, ESSENTIAL=1, PROFESSIONAL=2, HOSPITAL=3, ENTERPRISE=4, INTELLIGENCE=5`. `HOSPITAL` sits between `PROFESSIONAL` and `ENTERPRISE`, so any feature gated to `ENTERPRISE` (`>= ENTERPRISE`) stays gated for `HOSPITAL`.
- **Plan modes:** `FULL` (clinical + front desk), `FRONT_DESK` (reception/queue/billing only — clinical surfaces blocked via `FRONT_DESK_BLOCKED_ACCESS_TARGETS`), `CORE`.
- Feature visibility is additionally controlled by **per-clinic feature overrides** (`clinicFeatureOverridesSchema`) keyed by a `Feature` enum, so "feature-gated" below means tier **or** override.

**Implication for the audit:** A page being "rarely used" by one clinic may be the core workflow for another tier. Removal decisions must be filtered through tier/role, not raw usage — flagged inline where relevant.

### 0.3 Existing access infrastructure (already built — do not re-propose)

Access control is **centralized and fully wired**. Any audit recommendation that sounds like "make the app role/tier aware" is already done; the only work is filling per-page gaps.

| Concern | File | What it provides |
|---|---|---|
| Roles → permissions | `packages/types/src/access/access-matrix.ts` | `APP_PERMISSIONS`, `APP_PERMISSIONS_BY_ROLE`, `APP_ACCESS_TARGETS` (PAGE_*/API_*), `APP_ACCESS_MATRIX`, `FEATURE_TIER_MAP` |
| Tiers / features | `packages/types/src/billing/tier.ts` | `Tier` enum (+`INTELLIGENCE`), `tierSchema`, `Feature` enum, `BILLED_TIERS`, `PUBLISHED_PLAN_LADDER` |
| Front-desk gating | `packages/types/src/access/workspace-access.ts` | `FRONT_DESK_BLOCKED_ACCESS_TARGETS`, `shouldDenyAccessForFrontDeskMode` |
| Access decision | `apps/app/lib/access-control/access-policy.ts` | `canAccessTarget(target, ctx, mode)` |
| Path → target map | `apps/app/shared/lib/access-control/access-routes.ts` | `getAccessTargetForPath(pathname)` |
| Route guard | `apps/app/shared/components/guards/page-access-guard.tsx` | `<PageAccessGuard>` (redirects unauthorized → `/today`) |
| Gating components | `apps/app/shared/components/auth/` | `access-gate.tsx`, `feature-gate.tsx`, `can.tsx`, `feature-guard.tsx` |
| Nav config + filtering | `nav-config-sections.tsx`, `sidebar/use-sidebar-sections.ts` | `NavItem { feature?, accessTarget? }`, filtered per role × tier × mode × intelligence |
| Permission state | `apps/app/lib/stores/permission-store.ts` | `usePermissionStore` (`canAccess`, `currentTier`, `currentMode`, `hasIntelligence`) |

---

## 1. Route Inventory at a Glance

| Group | Count | Notes |
|---|---|---|
| Clinic staff — protected (`(protected)`) | 46 | Includes 4 hidden settings sub-routes the prior audit missed |
| Patient portal (`portal`) | 10 | |
| Lab portal (`lab-portal`) | 2 | |
| Setup & auth (`(auth)` + `(setup)`) | 14 | |
| Public / patient-facing (`(public)`, `book`) | 2 | `/book/[referralCode]`, `/mobile-upload/[id]` — **both were missing from v1** |
| Developer / test only (`(tools)`, `e2e-session-seed`) | 2 | Should be excluded from prod nav & sitemap |
| **Total `page.tsx` files** | **76** | |

**Newly catalogued routes (absent from v1):**

| Route | Group | Why it matters |
|---|---|---|
| `/book/[referralCode]` | public | **Customer acquisition surface** — public self-booking via a doctor/clinic referral link. High value, deserves its own redesign/SEO assessment. |
| `/mobile-upload/[id]` | public | Phone-based document capture (hand-off from desktop OCR import). Part of the import funnel. |
| `/settings/compliance` | protected | Standalone compliance settings route (separate from the in-page tab). |
| `/settings/compliance/consent-template` | protected | Consent-form template editor. |
| `/settings/team/join-requests` | protected | **Already exists** — invalidates v1's "add a Team route" proposal (see §6.3). |
| `/settings/whatsapp-sender` | protected | Standalone WhatsApp sender config route (mirrors the settings tab). |
| `/specialty` | protected | Specialty module index (parent of `/specialty/dental-charts`). |
| `/(tools)/visual-test/[fixture]` | dev | Visual-regression fixture renderer — **must not ship in prod nav/sitemap**. |
| `/e2e-session-seed` | dev | E2E test session seeder — **must be env-gated off in prod**. |

---

## 2. Clinic Staff Pages (Protected Routes)

Legend — **Nav:** ✅ in sidebar/top-nav · 🔒 hidden (reachable by direct link / command palette only). **Roles** lists the primary intended audience.

### 2.1 Dashboard & Today

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/today` | ✅ | All staff | Stats, schedule, recent patients, alerts, quick actions, daily progress | **Keep** — core daily landing page. Redesign (see §6.6). |
| `/coding-queue` | 🔒 | DOCTOR/ADMIN | Medical coding queue | **Evaluate** — hidden today. Likely only relevant where CPT/insurance coding is active; gate behind the insurance/coding feature flag and surface in nav *only* for those clinics rather than removing. |

### 2.2 Consultation

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/consultation` | ✅ | DOCTOR/NURSE | OPD queue, nurse prep, doctor "next", history | **Keep** — clinical hub. Blocked in `FRONT_DESK` plan mode. |
| `/consultation/[id]` | 🔒 (entered from queue) | DOCTOR | Full-screen workspace: vitals, prescriptions, billing, notes, specialty exams, structured inputs, AI suggestions | **Keep** — the core product. Already well-designed. |

### 2.3 Appointments

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/appointments` | ✅ | RECEPTIONIST/DOCTOR | Calendar/list view, booking dialog, time slots, doctor-delay tracking, summary bar | **Keep** — essential. Pairs with public `/book/[referralCode]`. |

### 2.4 Patients

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/patients` | ✅ | All staff | Searchable, paginated directory | **Keep**. |
| `/patients/[id]` | 🔒 (drill-in) | DOCTOR/NURSE/RECEPTIONIST | History, metrics, allergies, tags, communication, AI advisor, WhatsApp composer | **Keep**. Candidate host for Referrals + Visit-timeline (§6.4). |

### 2.5 Billing & Payments

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/invoices` | ✅ | RECEPTIONIST/ADMIN | List, status, filters | **Keep**. Add bulk actions + summary bar (§6.4/§6.6). |
| `/invoices/new` | 🔒 | RECEPTIONIST/ADMIN | Create with line items | **Keep**. |
| `/invoices/[id]` | 🔒 | RECEPTIONIST/ADMIN | View + payment activity log | **Keep**. |
| `/invoices/[id]/edit` | 🔒 | RECEPTIONIST/ADMIN | Edit | **Keep**. |
| `/desk/collect-payment` | ✅ | RECEPTIONIST | Front-desk collection, open invoices, record payments | **Keep** — essential for `FRONT_DESK` mode. |
| `/desk/floor` | 🔒 | RECEPTIONIST | Desk floor panel | **Merge** → tab inside `/desk` (see M1). |
| `/daybook` | ✅ | ADMIN/RECEPTIONIST | Daily ledger, collections by mode | **Keep** — accounting. Candidate child of a `/reports` hub (A1). |
| `/billing-locked` | 🔒 (gate) | All | Subscription lock notice | **Keep** — required for dunning/gating. |

### 2.6 Insurance Claims

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/insurance-claims` | ✅ | ADMIN/DOCTOR | List + status filter (DRAFT→SETTLED) | **Keep** — gate to clinics with insurance enabled. |
| `/insurance-claims/new` | 🔒 | ADMIN/DOCTOR | Create | **Keep**. |
| `/insurance-claims/[id]` | 🔒 | ADMIN/DOCTOR | Detail + status timeline | **Keep**. |
| `/insurance-claims/[id]/edit` | 🔒 | ADMIN/DOCTOR | Edit | **Keep**. |

> **Note:** Insurance claims, coding-queue, and analytics' CPT-revenue all belong to the same "billing/coding" capability. If a clinic doesn't bill insurance, all three should disappear together via one feature flag — not be individually hidden.

### 2.7 Prescriptions & Clinical

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/prescriptions` | ✅ | DOCTOR | List, search, date filter, sort | **Keep**. |
| `/prescriptions/[id]` | 🔒 | DOCTOR | Single Rx document view | **Keep**. |
| `/lab-tests` | ✅ | DOCTOR/NURSE | Orders, results, catalog, directory (in-house + external) | **Keep**. Split tabs + add results-entry (§6.4/§6.6). |
| `/documents` | ✅ | All staff | Document archive | **Keep**. |
| `/templates` | 🔒 | DOCTOR/ADMIN | Clinical document templates | **Merge** → Settings / consultation resource (M3). |
| `/vaccines` | ✅ | NURSE/DOCTOR | Vaccine tracking & scheduling | **Keep**. Pediatric/GP value; tier-gate where irrelevant. |
| `/referrals` | ✅ | DOCTOR/RECEPTIONIST | Patient referrals | **Re-evaluate** — currently a top-level nav item. Either keep as nav (referral-link growth loop) **or** move into patient detail (M2). Decide based on whether referrals are inbound-marketing or per-patient. |
| `/follow-ups` | ✅ | DOCTOR/NURSE | Overdue / due-today / completed | **Keep**. |

### 2.8 Services

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/whatsapp` | ✅ | ADMIN/RECEPTIONIST | Sent, campaigns, templates, delivery tracking | **Keep** — significant redesign (§6.6). |
| `/inbox` | ✅ | All staff | Notifications, join requests, consultations | **Keep**. |
| `/inventory` | ✅ | ADMIN/PHARMACY | Items, stock, categories, stats | **Keep** — add low-stock alerts (§6.4). |

### 2.9 Import & Data

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/import` | ✅ | ADMIN | Import hub | **Keep**. |
| `/import/ocr` | 🔒 | ADMIN | Document scanning (pairs with `/mobile-upload/[id]`) | **Keep**. |
| `/import/excel` | 🔒 | ADMIN | CSV/Excel import | **Keep**. |

### 2.10 Analytics & AI

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/analytics` | ✅ | ADMIN/DOCTOR | Disease trends, CPT revenue, compliance dashboard | **Keep** → anchor of `/reports` hub (A1). |
| `/ai-assistant` | ✅ | DOCTOR | AI prescription suggestions (feature-gated) | **Keep**. |

### 2.11 Specialty & Hospital

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/specialty` | 🔒 | DOCTOR | Specialty module index | **Keep** (was missing in v1) — only meaningful if ≥1 specialty module enabled; otherwise hide entirely. |
| `/specialty/dental-charts` | 🔒 | DOCTOR (dental) | Dental charting | **Keep** — tier/specialty-gated. |
| `/hospital/beds` | ✅ | ADMIN/NURSE | IPD bed allocation & tracking | **Keep** — `HOSPITAL` tier only; ensure hidden for clinic tiers. |

### 2.12 Settings sub-routes (standalone, outside the tabbed Settings page)

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/settings` | ✅ | ADMIN/ADMIN_DOCTOR | Tabbed settings shell (19 tabs, §3) | **Keep**. |
| `/settings/compliance` | 🔒 | ADMIN | Compliance settings | **Consolidate** — confirm this isn't duplicating the in-page ABDM/compliance tab; pick one home. |
| `/settings/compliance/consent-template` | 🔒 | ADMIN | Consent-template editor | **Keep** (deep editor justifies a route). |
| `/settings/team/join-requests` | 🔒 | ADMIN | Approve/deny join requests | **Keep** — also surfaced in `/inbox`; ensure they share one data view, not two implementations. |
| `/settings/whatsapp-sender` | 🔒 | ADMIN | WhatsApp sender config | **De-duplicate** — same concern as the WhatsApp Sender settings tab; one should redirect to the other. |

### 2.13 Other

| Route | Nav | Roles | Features | Assessment |
|---|---|---|---|---|
| `/profile` | 🔒 | All staff | User profile | **Merge** → Settings/account (M4). |
| `/help` | ✅ | All staff | FAQs, guides, support contact | **Keep** — single source for support (absorbs the Help settings tab, R1). |

---

## 3. Settings Tabs (19 tabs, 5 categories)

Confirmed against `features/settings/constants.ts`.

### 3.1 Practice
| Tab | Component | Roles | Assessment |
|---|---|---|---|
| General | `ClinicGeneralSettings` | ADMIN | **Keep** — facility name/type/address/phone/GSTIN/HFR ID/referral links. |
| Team Members | `MemberManagementSettings` | ADMIN | **Keep** — list, invite, manage, verification badges. Extend (see §6.3 A2′). |
| Billing & Subscription | `SubscriptionSettings` | ADMIN | **Keep** — plan, comparison, history, recovery, alerts. |
| Enterprise Branding | `EnterpriseBrandingSettings` | ADMIN (ENTERPRISE) | **Keep** — fully hide below ENTERPRISE. |

### 3.2 Clinical
| Tab | Component | Roles | Assessment |
|---|---|---|---|
| Availability | `DoctorAvailabilitySettings` + `DoctorTimeAwaySettings` | DOCTOR/ADMIN | **Keep**. |
| Leave Management | `LeaveManagementSettings` | ADMIN | **Keep** — feature-gated. |
| Queue | `QueueSettings` | ADMIN | **Keep** — slot/grace/buffer + live status. |
| Prescriptions | `PrescriptionDefaultsSettings` | DOCTOR | **Keep**. |
| OPD slip | `OpdSlipSettings` | DOCTOR | **Merge** → Prescriptions tab (M5). |
| Labs | `LabDirectorySettings` + `LabTestsCatalogSettings` | ADMIN | **Keep**. |
| ABDM | `AbdmSettingsPanel` | ADMIN | **Keep** but hide "coming soon" sub-items; India-specific. |

### 3.3 Automation
| Tab | Component | Roles | Assessment |
|---|---|---|---|
| Reminders | `ReminderSettings` | ADMIN | **Keep** — add SMS channel (§6.4). |
| WhatsApp Sender | `WhatsappSenderSettings` + `WhatsappTemplatesSettings` | ADMIN | **Keep** — reconcile with standalone `/settings/whatsapp-sender` route. |

### 3.4 Account
| Tab | Component | Roles | Assessment |
|---|---|---|---|
| Doctor Profile | `DoctorProfileSettings` | DOCTOR | **Keep** — signature, registration, HPR ID, certificate. |
| Notifications | `NotificationSettings` | All | **Keep**. |
| Security | `SecuritySettings` | All | **Keep** — 2FA, session timeout, audit logs. |
| Appearance | `AppearanceSettings` | All | **Keep** — theme, accent, compact, live preview. |
| Help & support | `HelpSupportSettingsPanel` | All | **Remove** → duplicate of `/help` (R1). |

### 3.5 Danger Zone
| Tab | Component | Roles | Assessment |
|---|---|---|---|
| Danger Zone | `DangerZoneSettings` | ADMIN/self | **Keep** — sign out, delete account. |

---

## 4. Patient Portal (10 routes) — all **Keep**

| Route | Features |
|---|---|
| `/portal` | Portal home / dashboard |
| `/portal/login` | Phone OTP auth |
| `/portal/appointments` | Appointment list (could add self-reschedule → ties to `/book`) |
| `/portal/prescriptions` | Prescriptions |
| `/portal/medications` | Current medications |
| `/portal/history` | Medical history |
| `/portal/billing` | Invoices / payments (add pay-online?) |
| `/portal/metrics` | Vitals / metrics tracking |
| `/portal/profile` | Profile |
| `/portal/profile/consent-form` | Consent form |

**Cross-cutting opportunity:** portal `appointments` + public `/book/[referralCode]` + staff `/appointments` are three views of one booking system. Audit them together for a consistent slot/availability experience.

---

## 5. Lab Portal, Setup/Auth, Public & Dev Routes

### 5.1 Lab Portal (2) — **Keep**
`/lab-portal` (LAB workspace), `/lab-portal/login`. **Add:** results-entry workflow here, paired with the staff `/lab-tests` results view (§6.4).

### 5.2 Setup & Auth (14) — **Keep**
`/login`, `/forgot-password`, `/reset-password`, `/choose-path`, `/onboarding`, `/verify-email`, `/verify-email/verified`, `/verify-email-sent`, `/verify-doctor`, `/join-clinic`, `/join-request-status`, `/clinic-selection`, `/upload-signature/onboarding`, `/upload-signature/[token]`.
**Watch:** four email-verification routes is a lot — consider collapsing `verify-email` / `verify-email-sent` / `verify-email/verified` into one route with state (low priority).

### 5.3 Public / patient-facing (2) — **Keep, elevate**
| Route | Assessment |
|---|---|
| `/book/[referralCode]` | **Strategic.** Public, unauthenticated booking — the top of the acquisition funnel. Deserves a dedicated UX/SEO/performance review (mobile-first, fast, trust signals). Not just "keep." |
| `/mobile-upload/[id]` | **Keep** — mobile capture hand-off for OCR import. Verify the QR/link hand-off from `/import/ocr` is smooth. |

### 5.4 Developer / test (2) — **Exclude from prod**
| Route | Assessment |
|---|---|
| `/(tools)/visual-test/[fixture]` | **Dev-only — already gated.** `(tools)/layout.tsx` + `visual-test/layout.tsx` call `notFound()` in production unless `NEXT_PUBLIC_ENABLE_TOOLS`/`NEXT_PUBLIC_ENABLE_VISUAL_TESTS` is set. No change needed. |
| `/e2e-session-seed` | **Dev-only — now gated (2026-06-19).** Was reachable in prod (rendered an empty fragment, no guard). Now `notFound()` in production unless `NEXT_PUBLIC_ENABLE_E2E_SEED=true`; e2e runs use `next dev` so tests are unaffected. |

> **`robots.ts` already disallows all crawlers** (`disallow: '/'`) and there is no sitemap, so neither route is discoverable externally.

---

## 6. Recommendations

### 6.1 Merge (consolidate UI without losing capability)

| ID | Merge | From | Into | Status / Rationale |
|---|---|---|---|---|
| M1 | Desk | `/desk/floor` | `/desk` with tabs (Collect Payment / Floor) | **Deferred** — UX restructure; changes nav + 4 e2e specs for low impact. Needs a UX call. |
| M2 | Referrals | `/referrals` (stub) | Patient Records → **Referrals** sub-tab | **✅ Done (designed).** Verified `/referrals` is a *patient→specialist referral* stub (backend pending: needs `PatientReferral` model + API domain, schema locked). Referrals are per-patient clinical letters, so the canonical home is now a Records sub-tab on `/patients/[id]`; removed the stub from primary nav. Placeholder until backend lands. Not the `/book/[referralCode]` booking loop. |
| M3 | Templates | `/templates` | Settings / consultation | **✅ Already satisfied.** `/templates` is already a thin directory hub whose tabs link out to where templates live (Settings → Prescriptions, `/settings/compliance`). Template *content* already lives in settings. Left the hub as-is (it has an e2e test + a consultation palette link); no redirect needed. |
| M4 | Profile | `/profile` | Settings → Account | **Declined (with reason).** `PAGE_PROFILE` is universal (DASHBOARD_ROLES incl. NURSE) but `PAGE_SETTINGS` is not (SETTINGS_ROLES excludes NURSE), and `/settings/*` is gated by one prefix target — merging would either strand NURSE or over-broaden settings to admin sub-pages. `/profile` stays its own universal page; its content was extracted into a shared `ProfileAccountSettings` panel as cleanup. |
| M5 | OPD slip | Settings: OPD slip tab | Settings: Prescriptions tab → "Prescriptions & Print" | **✅ Done.** Merged into one tab; OPD slip keeps its `manageClinic` inner guard. |
| M6 *(new)* | WhatsApp Sender | Settings tab (duplicate) | `/settings/whatsapp-sender` route (canonical) | **✅ Done.** Removed the duplicate tab; old `?tab=whatsapp-sender` now redirects via `LEGACY_TAB_REDIRECTS`. |
| M7 *(new)* | Compliance | `/settings/compliance` ↔ tab | one canonical home | **✅ Already done** in code — `?tab=compliance` already redirects to the standalone route. No change needed. |

### 6.2 Remove / restrict

| ID | Item | Action | Status / Rationale |
|---|---|---|---|
| R1 | Settings → Help & support tab | Remove | **✅ Done.** Removed; `/help` already carries the same WhatsApp/email support contact. Orphaned panel deleted. |
| R2 | `/coding-queue` in nav | Show in nav only when coding feature is on | **✅ Done.** Added a nav item gated by `Feature.MEDICAL_CODING` + `PAGE_CODING_QUEUE`. |
| R3 *(new)* | `/e2e-session-seed` | env-gate out of prod | **✅ Done.** `/visual-test` was already gated at its layout. |

### 6.3 New / extended pages

| ID | Item | Action | Rationale |
|---|---|---|---|
| A1 | `/reports` hub | **Add** | Unify `/analytics` + `/daybook` + desk reports under one entry with tabs (Clinical / Financial / Compliance). |
| A2′ | Team management | **Extend, don't add** | `/settings/team/join-requests` already exists. Build the deeper team workflows (roles, permissions, activity log) under `/settings/team/*` rather than creating a brand-new route. *(Corrects v1's A2.)* |
| A3 *(new)* | `/book/[referralCode]` redesign | **Elevate** | Treat the public booking page as a product surface (conversion/SEO/mobile), not a leftover route. |

### 6.4 New features in existing pages

| Page | Feature | Rationale |
|---|---|---|
| `/today` | Revenue snapshot card | Today's collected vs pending (data already in daybook). |
| `/patients/[id]` | Visit timeline | Chronological visits + consult summaries in one place. |
| `/consultation/[id]` | Quick billing as a sidebar section | Billing is a modal today; inline it for complex invoices. |
| `/invoices` | Bulk actions | Batch payment/reminders/status. |
| `/lab-tests` + `/lab-portal` | Results-entry workflow | Results are display-only; add technician entry. |
| `/whatsapp` | Conversation view | Patient-centric chat vs flat sent/campaign lists. |
| Settings → Reminders | SMS channel | For clinics without WhatsApp. |
| `/inventory` | Low-stock alerts | Reorder-threshold notifications. |
| `/portal/billing` | Pay online | Close the loop with the payment system. |

### 6.5 Features to deprecate / hide

| Feature | Action |
|---|---|
| ABDM "coming soon" sub-items | Hide until live; show a banner on activation. |
| Enterprise Branding tab | Confirm fully hidden below ENTERPRISE tier. |
| Empty specialty index | Hide `/specialty` entirely when no module is enabled. |

### 6.6 Redesign assessment

| Page | Severity | Priority | Notes |
|---|---|---|---|
| `/whatsapp` | Significant | Medium | Re-architect around conversations/patient messaging. |
| `/today` | Moderate | High | Visual hierarchy: revenue chart, priority alerts, cleaner schedule. |
| `/invoices` | Moderate | High | Per-row quick-pay, colored status badges, outstanding/overdue summary bar. |
| `/lab-tests` | Moderate | Medium | Split Orders vs Catalog into clear tabs; add results entry. |
| `/book/[referralCode]` | Moderate | High | Mobile-first conversion redesign (new in v2). |
| `/settings` | Minor | Medium | After M5+R1 → 17 tabs; consider left-nav sections grouping Practice+Clinical. |
| `/consultation/[id]` | None | — | Already strong. |
| `/patients`, `/appointments` | None | — | Clean. |

---

## 7. Navigation & Information Architecture

**Current nav membership** (from `nav-config-sections.ts` + `nav-config.ts`):

- **In sidebar/top-nav (23):** today, consultation, appointments, patients, invoices, desk/collect-payment, daybook, insurance-claims, prescriptions, lab-tests, documents, vaccines, referrals, follow-ups, whatsapp, inbox, inventory, import, analytics, ai-assistant, hospital/beds, help, settings.
- **Hidden but real (≈15):** coding-queue, desk/floor, templates, profile, specialty(+dental-charts), billing-locked, the 4 settings sub-routes, all `[id]`/new/edit detail routes.

**IA findings:**

1. **Nav is already role/tier/mode-aware (no build needed).** Every `NavItem` in `nav-config-sections.tsx` carries `feature` + `accessTarget`, and `sidebar/use-sidebar-sections.ts` filters each item through `canAccessTarget(role, tier, mode, intelligence)`. `FRONT_DESK` mode already hides clinical entries via `FRONT_DESK_BLOCKED_ACCESS_TARGETS`. **The only work is a coverage audit:** confirm each `NavItem` has the *correct* `feature`/`accessTarget` and that none is missing one (see §10/§11 for the access model). The "23 in sidebar" list above is the *superset*; an individual user sees a filtered subset.
2. **Flat, long sidebar (23 items).** Group into sections: *Clinical*, *Front Desk / Billing*, *Patients & Comms*, *Insights*, *Admin*. The `/reports` hub (A1) absorbs analytics + daybook and shortens the list.
3. **Hidden-but-important routes.** `/coding-queue`, `/specialty`, `/templates` are reachable only by URL — fine if intentional, but they should be in the command palette and conditionally promoted to nav when their feature is on.
4. **Duplicate homes.** WhatsApp sender and compliance each have both a settings tab and a standalone route; join-requests appear in both `/inbox` and `/settings/team/join-requests`. Pick one canonical surface per concern (M6/M7) to avoid drift.

---

## 8. Prioritized Roadmap

Effort: S (≤1d) · M (2–4d) · L (≥1wk). Impact: ★ low → ★★★ high.

| Phase | Item | Effort | Impact |
|---|---|---|---|
| **P0 — Safety/correctness** | R3: env-gate `/e2e-session-seed` out of prod ✅ done (`/visual-test` already gated) | S | ★★★ |
| | Verify ENTERPRISE/HOSPITAL tier gating (branding, beds) | S | ★★ |
| **P1 — Quick wins** | R1: remove Help settings tab → `/help` ✅ | S | ★ |
| | M5: merge OPD slip into Prescriptions tab ✅ | S | ★ |
| | M6 de-dup WhatsApp sender ✅ · M7 compliance already deduped ✅ | M | ★★ |
| | R2: feature-gated `/coding-queue` nav item ✅ | S | ★★ |
| | §7.1: nav access-coverage audit ✅ (filtering already existed; added `/ai-assistant` accessTarget) | S | ★★ |
| **P2 — Structure** | M2: referrals → per-patient Records sub-tab ✅ · M3 templates already in settings ✅ | M | ★ |
| | A1: `/reports` hub ⏸ deferred (cross-package target + double-scaffold) · M4 ✋ declined (access mismatch) · M1 ⏸ deferred | L | ★★ |
| | §7.2: sectioned sidebar ⏸ deferred (coupled to NavSectionId + nav-order persistence) | M | ★★ |
| **P3 — Value features** | `/today` revenue card · `/invoices` bulk + summary | M | ★★★ |
| | Lab results-entry workflow (`/lab-tests` + `/lab-portal`) | L | ★★ |
| | `/whatsapp` conversation redesign | L | ★★ |
| | A3: `/book/[referralCode]` conversion redesign | M | ★★★ |
| **P4 — Nice to have** | Visit timeline, low-stock alerts, SMS reminders, portal pay-online | M–L | ★★ |

---

## 9. Summary

| Metric | Value |
|---|---|
| Total `page.tsx` routes | 76 |
| Clinic-staff protected routes | 46 |
| Settings tabs | 19 (→17 after M5 + R1) |
| Keep as-is | ~62 |
| Merge | 7 (M1–M7) |
| Remove / restrict | 3 (R1–R3) |
| New / extended | 3 (A1, A2′, A3) |
| New features in existing pages | 9 |
| Redesigns | 6 (1 significant, 4 moderate, 1 minor) |
| Routes missing from v1, now added | 9 |

**Top three actions:** (1) env-gate dev/test routes out of production (P0); (2) consolidate duplicate surfaces — WhatsApp sender, compliance, OPD-slip/Help — and audit nav access-target coverage (P1; the filtering engine already exists); (3) elevate the public `/book/[referralCode]` page from "leftover route" to a maintained acquisition surface (P3).

---

## 10. Tiers, Roles, and Access Control

### 10.1 Tier System

| Tier | Numeric Value | Target Clinic Size | Key Differentiators |
|---|---|---|---|
| **STARTER** | 0 | Solo practitioner | Basic patient management, prescriptions, appointments, document archival |
| **ESSENTIAL** | 1 | Small clinic (1-3 doctors) | + Invoicing, analytics, lab tests, inventory, vaccines, queue, WhatsApp, audit logs, insurance, AI features |
| **PROFESSIONAL** | 2 | Growing clinic (3-10 doctors) | + WhatsApp own number, broadcast campaigns, full EHR, API access, SSO, bulk import, multi-location analytics |
| **HOSPITAL** | 3 | Multi-branch hospital | + WhatsApp managed number, bed management (IPD) |
| **ENTERPRISE** | 4 | Large hospital network | + Data warehouse export, dedicated deployment, white-label branding, locked custom theme |
| **INTELLIGENCE** | 5 (add-on) | Any tier | AI add-on — checked via boolean flag, never via numeric >= comparison |

**Published plan ladder** (billable tiers only): STARTER → ESSENTIAL → PROFESSIONAL → HOSPITAL → ENTERPRISE

### 10.2 Plan Modes

Each clinic has a `Tier` (the clinical capability tier) and a `PlanMode` (the billing SKU variant):

| PlanMode | Pricing Multiplier | Description |
|---|---|---|
| `FULL` | 1.0 | Full clinical features — no restrictions |
| `FRONT_DESK` | 0.7 | Billing-only mode — blocks clinical features (prescriptions, vaccines, coding, AI, etc.) |
| `CORE` | 0.8 | Comms-light mode — blocks WhatsApp, broadcast, and AI features |

**Mode-blocked features:**

| Blocked by FRONT_DESK | Blocked by CORE |
|---|---|
| DIGITAL_PRESCRIPTIONS, MEDICINES_LIST, VACCINE_TRACKING, PRESCRIPTION_TEMPLATES, DOCTOR_SIGNATURE, MEDICAL_CODING, LEAVE_MANAGEMENT, INVENTORY, INSURANCE_BILLING, OCR_ADVANCED, FULL_EHR, API_ACCESS, MULTI_LOCATION_ANALYTICS, CUSTOM_BRANDING, DATA_WAREHOUSE_EXPORT, SSO, BULK_IMPORT_SUITE, AI_PRESCRIPTION_ASSISTANT, AI_DIAGNOSIS_HINTS, SMART_TASK_ENGINE, PREDICTIVE_NO_SHOW, PATIENT_SEGMENTATION, ANOMALY_DETECTION, MULTI_DOCTOR, MULTI_CLINIC | WHATSAPP_MESSAGING, WHATSAPP_OWN_NUMBER, WHATSAPP_MANAGED_NUMBER, AUTO_REMINDERS, BROADCAST_CAMPAIGNS, AI_PRESCRIPTION_ASSISTANT, AI_DIAGNOSIS_HINTS, SMART_TASK_ENGINE, PREDICTIVE_NO_SHOW, PATIENT_SEGMENTATION, ANOMALY_DETECTION |

### 10.3 Feature-to-Tier Map (56 Features)

#### Starter (Tier 0) — 11 Features
PAPER_SCANNING, EXCEL_IMPORT, PATIENT_DEDUPLICATION, BASIC_PATIENT_MANAGEMENT, DOCUMENT_ARCHIVAL, EXPORT_CSV, OCR_BASIC, CALENDAR_SLOTS, VISIT_HISTORY, MEDICINES_LIST, DIGITAL_PRESCRIPTIONS

#### Essential (Tier 1) — 28 Features
INVOICING, BASIC_ANALYTICS, MEDICAL_CODING, ROLE_MANAGEMENT, AUTO_REMINDERS, PAYMENT_LINKS, PRESCRIPTION_TEMPLATES, MULTI_DEVICE, CONSENT_MANAGEMENT, DOCTOR_SIGNATURE, LEAVE_MANAGEMENT, WHATSAPP_MESSAGING, MULTI_DOCTOR, MULTI_CLINIC, LAB_TESTS, VACCINE_TRACKING, INVENTORY, QUEUE_MANAGEMENT, AUDIT_LOGS, INSURANCE_BILLING, DIGITAL_INTAKE_FORMS, OCR_ADVANCED, ADVANCED_ANALYTICS, AI_PRESCRIPTION_ASSISTANT, AI_DIAGNOSIS_HINTS, SMART_TASK_ENGINE, PREDICTIVE_NO_SHOW, ANOMALY_DETECTION, ABDM_INTEGRATION

#### Professional (Tier 2) — 9 Features
WHATSAPP_OWN_NUMBER, BROADCAST_CAMPAIGNS, PATIENT_SEGMENTATION, FULL_EHR, API_ACCESS, MULTI_LOCATION_ANALYTICS, CUSTOM_BRANDING, SSO, BULK_IMPORT_SUITE

#### Hospital (Tier 3) — 1 Feature
WHATSAPP_MANAGED_NUMBER

#### Enterprise (Tier 4) — 4 Features
DATA_WAREHOUSE_EXPORT, DEDICATED_DEPLOYMENT, WHITE_LABEL_BRANDING, LOCKED_CUSTOM_THEME

#### Intelligence (add-on) — checked via boolean flag, not numeric comparison

### 10.4 Per-Clinic Override Features

These features can be individually toggled per clinic via `Clinic.features` overrides (constrained by `OVERRIDABLE_FEATURES`):

WHATSAPP_MESSAGING, WHATSAPP_OWN_NUMBER, WHATSAPP_MANAGED_NUMBER, AI_PRESCRIPTION_ASSISTANT, AI_DIAGNOSIS_HINTS, SMART_TASK_ENGINE, PREDICTIVE_NO_SHOW, PATIENT_SEGMENTATION, ANOMALY_DETECTION, AUTO_REMINDERS, BROADCAST_CAMPAIGNS

### 10.5 Package Presets (Custom Bundles)

| Preset | Base Tier | What's Removed |
|---|---|---|
| PROFESSIONAL_NO_COMMS | Professional | WhatsApp messaging, own number, managed number, auto reminders, broadcast |
| PROFESSIONAL_NO_AI | Professional | All 6 AI features |
| PROFESSIONAL_CORE | Professional | Both comms + AI removed |
| HOSPITAL_NO_COMMS | Hospital | Same comms overrides |
| HOSPITAL_NO_AI | Hospital | Same AI overrides |
| HOSPITAL_CORE | Hospital | Both combined |

---

## 11. User Roles and Permissions

### 11.1 Role Hierarchy

| Role | Hierarchy Level | Description |
|---|---|---|
| `INTERNAL` | 5 (highest) | Docita platform staff — bypasses all permission checks (superuser) |
| `ADMIN` | 4 | Clinic administrator — full management (staff, billing, inventory, reports) but no clinical actions |
| `ADMIN_DOCTOR` | 3 | Dual-role admin + doctor — all admin permissions + consultations + prescriptions |
| `DOCTOR` | 2 | Clinical staff — consultations, prescriptions, patient management |
| `NURSE` | 1.5 | Clinical support — view/edit patients, view/create appointments, view prescriptions |
| `RECEPTIONIST` | 1 | Front desk — patients, appointments, invoices, prescriptions |
| `LAB` | 1 | Lab technician — lab orders, sample collection, results upload |
| `PATIENT` | 0 (lowest) | Patient — view own appointments only |

### 11.2 Permission Matrix (23 Permissions)

| Permission | INTERNAL | ADMIN | ADMIN_DOCTOR | DOCTOR | NURSE | RECEPTIONIST | LAB | PATIENT |
|---|---|---|---|---|---|---|---|---|
| manageStaff | bypass | Y | Y | - | - | - | - | - |
| manageClinic | bypass | Y | Y | - | - | - | - | - |
| startConsultation | bypass | - | Y | Y | - | - | - | - |
| viewPatients | bypass | Y | Y | Y | Y | Y | - | - |
| createPatient | bypass | Y | Y | Y | - | Y | - | - |
| editPatient | bypass | Y | Y | Y | Y | Y | - | - |
| deletePatient | bypass | Y | Y | - | - | - | - | - |
| viewAppointments | bypass | Y | Y | Y | Y | Y | - | Y |
| createAppointment | bypass | Y | Y | Y | Y | Y | - | - |
| manageBilling | bypass | Y | Y | - | - | - | - | - |
| viewInvoices | bypass | Y | Y | - | - | Y | - | - |
| createInvoice | bypass | Y | Y | - | - | Y | - | - |
| viewPrescriptions | bypass | Y | Y | Y | Y | Y | - | - |
| createPrescription | bypass | - | Y | Y | - | - | - | - |
| viewReports | bypass | Y | Y | - | - | - | - | - |
| manageInventory | bypass | Y | Y | - | - | - | - | - |
| manageTemplates | bypass | Y | Y | - | - | - | - | - |
| exportData | bypass | Y | Y | - | - | - | - | - |
| viewLabOrders | bypass | Y | Y | - | - | - | Y | - |
| recordSampleCollection | bypass | Y | Y | - | - | - | Y | - |
| uploadLabResult | bypass | Y | Y | - | - | - | Y | - |
| viewPlatformAnalytics | bypass | - | - | - | - | - | - | - |
| viewSystemLogs | bypass | - | - | - | - | - | - | - |

### 11.3 Role Group Definitions

| Group | Roles | Used For |
|---|---|---|
| `ADMIN_ROLES` | ADMIN, ADMIN_DOCTOR, INTERNAL | Settings tabs (general, members, subscription, etc.) |
| `DOCTOR_ROLES` | ADMIN, ADMIN_DOCTOR, INTERNAL, DOCTOR | Clinical settings (availability, prescriptions, OPD slip) |
| `QUEUE_ROLES` | ADMIN, ADMIN_DOCTOR, INTERNAL, RECEPTIONIST | Queue settings |
| `BILLING_ROLES` | ADMIN, ADMIN_DOCTOR | Billing/subscription management |

---

## 12. Access Target System

### 12.1 Access Target Types

| Type | Prefix | Count | Purpose |
|---|---|---|---|
| Page targets | `page.*` | 18 | UI route protection |
| API targets | `api.*` | 28 | Backend endpoint protection |

### 12.2 Access Policy Structure

Each access target maps to an `AccessPolicy` with:

```typescript
interface AccessPolicy {
  read?: {
    roles?: UserRole[];           // allowed roles
    permissions?: AppPermission[]; // required permissions (ALL must be present)
  };
  write?: {
    roles?: UserRole[];
    permissions?: AppPermission[];
  };
  feature?: Feature;    // required Feature enum value
  tier?: Tier;          // minimum Tier enum value
  comingSoon?: boolean; // if true, always denied
}
```

### 12.3 Access Evaluation Flow

For every page or API request:

1. **Coming-soon gate** — if `comingSoon: true`, deny
2. **Front Desk mode gate** — if FRONT_DESK mode and target is blocked, deny (INTERNAL bypasses)
3. **Role check** — user's role must be in `read.roles` or `write.roles`
4. **Permission check** — all listed permissions must be present for the role
5. **Feature gate** — `canAccessFeature(feature)` checks tier + planMode + overrides
6. **Tier gate** — clinic's numeric tier must be >= required tier

### 12.4 Front Desk Blocked Access Targets

When a clinic is in FRONT_DESK mode, these targets are denied (except INTERNAL):

PAGE_CONSULTATION, PAGE_PRESCRIPTIONS, PAGE_DOCUMENTS, PAGE_SPECIALTY, PAGE_CODING_QUEUE, PAGE_AI_ASSISTANT, PAGE_HOSPITAL, API_PRESCRIPTIONS, API_MEDICAL_DOCUMENTS, API_MEDICAL_CODING

---

## 13. Page-by-Page Access Matrix

### 13.1 Sidebar Nav Items — Gating Summary

| Nav Item | Min Tier | Feature Gate | Access Target | Roles That See It |
|---|---|---|---|---|
| Today | Starter | — | PAGE_DASHBOARD | All clinic roles |
| Consultation | Starter | — | PAGE_CONSULTATION | All except RECEPTIONIST, LAB, PATIENT (blocked by FRONT_DESK mode) |
| Appointments | Starter | CALENDAR_SLOTS | PAGE_APPOINTMENTS | All clinic roles |
| Patients | Starter | BASIC_PATIENT_MANAGEMENT | PAGE_PATIENTS | All except LAB, PATIENT |
| Payment desk | Essential | INVOICING | PAGE_DESK_PAYMENT | ADMIN, ADMIN_DOCTOR, RECEPTIONIST, INTERNAL |
| Invoices | Essential | INVOICING | PAGE_INVOICES | ADMIN, ADMIN_DOCTOR, RECEPTIONIST, INTERNAL |
| Daybook | Essential | INVOICING | PAGE_INVOICES | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Insurance Claims | Essential | INSURANCE_BILLING | PAGE_INSURANCE_CLAIMS | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Prescriptions | Starter | DIGITAL_PRESCRIPTIONS | PAGE_PRESCRIPTIONS | All except RECEPTIONIST, LAB, PATIENT (blocked by FRONT_DESK) |
| Lab Tests | Essential | LAB_TESTS | PAGE_LAB_TESTS | ADMIN, ADMIN_DOCTOR, INTERNAL, LAB |
| Documents | Starter | DOCUMENT_ARCHIVAL | PAGE_DOCUMENTS | All except RECEPTIONIST, LAB, PATIENT (blocked by FRONT_DESK) |
| WhatsApp | Essential | WHATSAPP_MESSAGING | PAGE_WHATSAPP | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Inbox | Starter | — | PAGE_DASHBOARD | All clinic roles |
| Inventory | Essential | INVENTORY | PAGE_INVENTORY | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Vaccines | Essential | VACCINE_TRACKING | PAGE_VACCINES | All except RECEPTIONIST, LAB, PATIENT (blocked by FRONT_DESK) |
| Referrals | Starter | DIGITAL_PRESCRIPTIONS | PAGE_PATIENTS | All except LAB, PATIENT |
| Follow-ups | Starter | — | PAGE_DASHBOARD | All clinic roles |
| Analytics | Essential | BASIC_ANALYTICS | PAGE_ANALYTICS | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Import Data | Starter | — | PAGE_IMPORT | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Bed Management | Starter | — | PAGE_HOSPITAL | ADMIN, ADMIN_DOCTOR, INTERNAL (SPECIALTY clinic type only) |

### 13.2 Settings Tabs — Gating Summary

| Tab | Min Tier | Feature Gate | Required Permission | Required Roles |
|---|---|---|---|---|
| General | Starter | — | manageClinic | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Team Members | Starter | — | manageStaff | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Billing & Subscription | Starter | — | manageBilling | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Enterprise Branding | Starter | WHITE_LABEL_BRANDING | — | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Availability | Starter | — | — | ADMIN, ADMIN_DOCTOR, INTERNAL, DOCTOR |
| Leave Management | Starter | LEAVE_MANAGEMENT | — | ADMIN, ADMIN_DOCTOR, INTERNAL, DOCTOR |
| Queue | Essential | QUEUE_MANAGEMENT | manageClinic | ADMIN, ADMIN_DOCTOR, INTERNAL, RECEPTIONIST |
| Prescriptions | Starter | — | createPrescription | ADMIN, ADMIN_DOCTOR, INTERNAL, DOCTOR |
| OPD Slip | Starter | — | — | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Labs | Essential | LAB_TESTS | — | ADMIN, ADMIN_DOCTOR, INTERNAL |
| ABDM | Essential | ABDM_INTEGRATION (comingSoon) | — | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Reminders | Starter | — | manageClinic | ADMIN, ADMIN_DOCTOR, INTERNAL |
| WhatsApp Sender | Professional | WHATSAPP_OWN_NUMBER | manageClinic | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Doctor Profile | Starter | — | — | ADMIN, ADMIN_DOCTOR, INTERNAL, DOCTOR |
| Notifications | Starter | — | manageClinic | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Security | Starter | — | manageClinic | ADMIN, ADMIN_DOCTOR, INTERNAL |
| Appearance | Starter | — | — | All roles |
| Help & Support | Starter | — | — | All roles |
| Danger Zone | Starter | — | — | All roles |

### 13.3 Role-Based Page Visibility Matrix

| Page | ADMIN | ADMIN_DOCTOR | DOCTOR | NURSE | RECEPTIONIST | LAB | PATIENT |
|---|---|---|---|---|---|---|---|
| Today | Y | Y | Y | Y | Y | Y | - |
| Consultation | Y | Y | Y | Y | - | - | - |
| Appointments | Y | Y | Y | Y | Y | Y | - |
| Patients | Y | Y | Y | Y | Y | - | - |
| Patient Detail | Y | Y | Y | Y | Y | - | - |
| Payment Desk | Y | Y | - | - | Y | - | - |
| Invoices | Y | Y | - | - | Y | - | - |
| Daybook | Y | Y | - | - | - | - | - |
| Insurance Claims | Y | Y | - | - | - | - | - |
| Prescriptions | Y | Y | Y | Y | - | - | - |
| Lab Tests | Y | Y | - | - | - | Y | - |
| Documents | Y | Y | Y | Y | - | - | - |
| WhatsApp | Y | Y | - | - | - | - | - |
| Inbox | Y | Y | Y | Y | Y | Y | - |
| Inventory | Y | Y | - | - | - | - | - |
| Vaccines | Y | Y | Y | Y | - | - | - |
| Referrals | Y | Y | Y | Y | Y | - | - |
| Follow-ups | Y | Y | Y | Y | Y | Y | - |
| Analytics | Y | Y | - | - | - | - | - |
| Import | Y | Y | - | - | - | - | - |
| AI Assistant | Y | Y | Y | - | - | - | - |
| Bed Management | Y | Y | - | - | - | - | - |
| Settings (all tabs) | Y | Y | partial | partial | partial | - | - |

### 13.4 What Each Role Sees in the Sidebar

**ADMIN / ADMIN_DOCTOR:**
TRACK: Today, Consultation, Appointments, Patients, Payment Desk, Invoices, Daybook, Insurance Claims, Prescriptions, Lab Tests, Documents
SERVICES: WhatsApp, Inbox, Inventory, Vaccines, Referrals, Follow-ups, Analytics, Import
SETTINGS: All 19 tabs

**DOCTOR:**
TRACK: Today, Consultation, Appointments, Patients, Prescriptions, Documents
SERVICES: Inbox, Vaccines, Referrals, Follow-ups
SETTINGS: Availability, Leave, Prescriptions, Doctor Profile, Appearance, Help, Danger Zone

**NURSE:**
TRACK: Today, Appointments, Patients, Prescriptions, Documents
SERVICES: Inbox, Referrals, Follow-ups
SETTINGS: Appearance, Help

**RECEPTIONIST:**
TRACK: Today, Appointments, Patients, Payment Desk, Invoices
SERVICES: Inbox, Referrals, Follow-ups
SETTINGS: Queue, Appearance, Help

**LAB:**
TRACK: Today, Appointments, Lab Tests
SERVICES: Inbox
SETTINGS: Appearance, Help

**PATIENT:**
No sidebar access (uses `/portal/*` routes)

---

## 14. Access Control Recommendations

### 14.1 Gaps Found

> **Re-verified 2026-06-19 against `shared/lib/access-control/access-routes.ts` and `nav-config*.tsx`.** The route→target coverage is in fact **complete** — every `(protected)` route resolves to an access target via `getAccessTargetForPath`, so `PageAccessGuard` enforces all of them. Earlier "no access target mapping" claims were stale and are corrected below.

| Gap | Verified status | Recommendation |
|---|---|---|
| `/coding-queue` not in sidebar | **Real, but narrow.** The route *is* mapped (`PAGE_CODING_QUEUE`) and guarded; it simply has no `NavItem`. | Add a `NavItem` gated by `Feature.MEDICAL_CODING` so it appears only for clinics with coding (R2/T1.6). |
| `/templates` access target | **Already mapped** → `PAGE_PRESCRIPTIONS` (`access-routes.ts:54`). No gap. | None for access; the M3 move into Settings is a separate IA decision. |
| `/profile` access target | **Already mapped** → `PAGE_PROFILE` (`access-routes.ts:20`). No gap. | None for access; the M4 move into Settings is a separate IA decision. |
| `/ai-assistant` nav item | **Minor.** Nav filters by `Feature.AI_PRESCRIPTION_ASSISTANT` only; it lacks an explicit `accessTarget: PAGE_AI_ASSISTANT` (the page guard still enforces it). | Add `accessTarget` to the nav item for defense-in-depth / role consistency. |
| `/help` nav item | **Acceptable.** No `accessTarget` (maps to `PAGE_DASHBOARD`, universally accessible). | Leave as-is. |
| Settings ABDM tab shows "coming soon" permanently | Feature gate exists but tab is always visible when role matches. | Add `comingSoon: true` to hide tab until ABDM is activated. |
| Enterprise Branding visible to all admin roles | Feature gate `WHITE_LABEL_BRANDING` is Enterprise-only, but verify the tab is fully hidden below Enterprise. | Verify gating; no code change if already correct. |

### 14.2 Role Coverage Analysis

| Role | Pages Accessible | Settings Tabs | Assessment |
|---|---|---|---|
| ADMIN | 22 pages | 14 tabs | Well-covered — full management without clinical actions |
| ADMIN_DOCTOR | 23 pages | 16 tabs | Full access — admin + clinical |
| DOCTOR | 8 pages | 6 tabs | Appropriate — clinical focus, no billing/admin |
| NURSE | 6 pages | 2 tabs | Appropriate — clinical support only |
| RECEPTIONIST | 6 pages | 3 tabs | Appropriate — front desk + billing |
| LAB | 3 pages | 1 tab | Appropriate — lab-only workflow |
| PATIENT | 0 sidebar pages | 0 tabs | Appropriate — uses separate portal |
| INTERNAL | All pages | All tabs | Appropriate — platform superuser |

### 14.3 Tier Coverage Analysis

| Tier | Pages Accessible (approx) | Key Gaps |
|---|---|---|
| STARTER (0) | 12 pages | No invoicing, no lab tests, no analytics, no WhatsApp |
| ESSENTIAL (1) | 22 pages | No WhatsApp own number, no broadcast, no SSO, no API |
| PROFESSIONAL (2) | 24 pages | No WhatsApp managed number, no hospital features |
| HOSPITAL (3) | 25 pages | No enterprise features |
| ENTERPRISE (4) | 25 pages | Full access |

### 14.4 Feature Gate Accuracy

| Feature | Mapped Tier | Nav/Settings Using It | Assessment |
|---|---|---|---|
| CALENDAR_SLOTS | Starter | Appointments nav | Correct — appointments are core |
| BASIC_PATIENT_MANAGEMENT | Starter | Patients nav | Correct — patients are core |
| DIGITAL_PRESCRIPTIONS | Starter | Prescriptions nav | Correct — prescriptions are core |
| DOCUMENT_ARCHIVAL | Starter | Documents nav | Correct — documents are core |
| INVOICING | Essential | Payment Desk, Invoices, Daybook nav | Correct — billing is Essential |
| LAB_TESTS | Essential | Lab Tests nav + Labs settings tab | Correct |
| INSURANCE_BILLING | Essential | Insurance Claims nav | Correct |
| WHATSAPP_MESSAGING | Essential | WhatsApp nav | Correct |
| WHATSAPP_OWN_NUMBER | Professional | WhatsApp Sender settings tab | Correct |
| WHITE_LABEL_BRANDING | Enterprise | Enterprise Branding settings tab | Correct |
| QUEUE_MANAGEMENT | Essential | Queue settings tab | Correct |
| LEAVE_MANAGEMENT | Essential | Leave Management settings tab | Correct |
| AI_PRESCRIPTION_ASSISTANT | Essential | AI Assistant nav | Correct |
| ABDM_INTEGRATION | Essential | ABDM settings tab (comingSoon) | Correct but should be hidden until ready |

### 14.5 Overridable Feature Distribution

| Category | Override Features | Available at Tier |
|---|---|---|
| WhatsApp | WHATSAPP_MESSAGING, WHATSAPP_OWN_NUMBER, WHATSAPP_MANAGED_NUMBER | Essential / Professional / Hospital |
| AI | AI_PRESCRIPTION_ASSISTANT, AI_DIAGNOSIS_HINTS, SMART_TASK_ENGINE, PREDICTIVE_NO_SHOW, PATIENT_SEGMENTATION, ANOMALY_DETECTION | Essential (most), Professional (segmentation) |
| Automation | AUTO_REMINDERS, BROADCAST_CAMPAIGNS | Essential / Professional |

All overrides are subordinate to PlanMode — if the mode blocks a feature, the override cannot grant it.
