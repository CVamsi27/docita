# Features Analysis — What the Product Does

Point-in-time: **2026-08-02**. This doc maps the product surface: the frontend features, the API domains that serve them, the shared capability modules, and the gating model that ties features to plans. The porting state is owned by [`../PORTING_PLAN_APP_VITE.md`](../PORTING_PLAN_APP_VITE.md); this doc analyzes the shape, not the migration.

## % Completed

| Area | % | Notes |
|---|---|---|
| Feature port (by count) | **83%** | 38/46 COMPLETE |
| Feature port (by files) | **71%** | 1,404/1,967 TS/TSX |
| Test port | **44%** | 122/275 |
| E2E port | **90%** | 45/50 app + 3/3 internal |
| i18n coverage | **98%** | 44/45 features with `useTranslation` (`legal` intentional + allowlisted) |

## 1. Frontend (apps/app-vite) — 46 features (47 feature dirs: `today` + `dashboard` count as one feature; `imports`/`upload-signature` are the dir names for import/signature-upload)

| Status | Count | Features |
|---|---|---|
| COMPLETE | 38 | today/dashboard, profile, auth, setup/onboarding, patients, consultation, settings, ipd, medical-documents, legal, search, follow-ups, subscription, appointments, patient-portal, public-booking, lab-tests, insurance-claims, analytics, inventory, ai-assistant, documents, import, referral-partner, mobile-upload, whatsapp, daybook, inbox, desk, lab-portal, pharmacy, prescriptions, referrals, templates, help, medical-coding, signature-upload, verify-email |
| SHELL | 8 | guided-tour (2/17), tools (1), today (1 re-export), profile (2), upgrade (1), errors (1), billing-locked (1), pharmacy (3) |
| MISSING | 3 | excel (`/import/excel` route only), ocr (`/import/ocr` route only), feedback |

Detailed feature breakdown (formerly PARTIAL, now COMPLETE):

| Feature | TSX | TS | Tests | Total | Status |
|---|---|---|---|---|---|
| settings | 94 | 17 | 7 | 111 | COMPLETE (was 24/128) |
| consultation | 67 | 78 | 6 | 145 | COMPLETE (was 140/186) |
| patients | 75 | 37 | 7 | 112 | COMPLETE (was 47/131) |
| invoices | 29 | 13 | 6 | 42 | COMPLETE (was 42/56) |
| setup/onboarding | 6 | 0 | 0 | 6 | COMPLETE (was 6/108) |

SHELL features (1-file stubs, not yet ported):

| Feature | Files | Status |
|---|---|---|
| guided-tour | 2 | Provider + index only |
| tools | 1 | Debug/dev page |
| today | 1 | Re-export of dashboard |
| profile | 2 | Page + test |
| upgrade | 1 | Static placeholder |
| errors | 1 | Not-found page only |
| billing-locked | 1 | Static page |
| pharmacy | 3 | Page + wrapper + smoke test |

Route tree: **96 route paths** in `src/App.tsx` (leaf + layout + index), 98 `React.lazy` page imports, 2 `<Navigate>` redirects (`/dashboard`→`/today`, `/`→`/today`), catch-all 404. Route groups: auth (3), setup (10), patient portal (10), public/partner/booking (9), lab portal (2), tools (2), protected clinical (50).

### Feature dependency chain (clinical day)

```
today (dashboard)
 └─ appointments ─→ consultation ─→ prescriptions ─→ invoices ─→ daybook / desk
                     └─ patients ──→ patient-portal, documents, medical-documents
subscription gates everything (billing-locked, upgrade, usage meters)
```

Porting order in the plan mirrors this: foundation → clinician day (P0) → revenue (P1) → portals (parallel) → admin (P2) → long tail (P3).

### i18n coverage

**44 of 45 features have i18n coverage** (98%) with 47 translation namespaces across 2 locales (en/hi).

Features with i18n: ai-assistant, analytics, appointments, auth, consultation, dashboard, daybook, desk, documents, follow-ups, help, imports, inbox, insurance-claims, inventory, invoices, ipd, lab-tests, medical-coding, medical-documents, mobile-upload, patient-portal, patients, pharmacy, prescriptions, profile, public-booking, referral-partner, referrals, search, settings, setup, subscription, upload-signature, verify-email, whatsapp.

The only feature without i18n is `legal` (ConsentNoticeModal) — intentional, allowlisted in `check:i18n-coverage`.

## 1.5 Frontend Density — measured 2026-08-02

| Metric | Count |
|---|---|
| React components (TSX files) | 802 (features + shared components) |
| Custom hook files | 194 (170+ `use-*` named, ~210+ export sites) |
| Context providers | 12 (auth, clinic, tier, config, socket, confirm, ask-ai, theme, guided-tour, 3 consultation workspace) |
| React Query hook files (useQuery/useMutation/useInfiniteQuery) | 25 |
| TypeScript errors | 0 (check-types passes clean) |
| `console.log/error` in features | 0 |
| `as any` in features | 0 |
| `@ts-expect-error`/`@ts-ignore` in features | 0 |
| TODO/FIXME/HACK in features | 0 |
| Bundle (gzip) | **816KB** (2.6MB raw, 171 assets) |
| Lazy routes | **98** / 100 (98% lazy-loaded) |
| Files >200 lines | **96** (2 >400: App.tsx 478, test 544) |
| Import discipline | **0** deep relative imports (`../`) — alias + workspace imports used |
| Dead code signals | 118 files with no imports, 46 unused barrel `index.ts` |

Top features by component density: settings (94 TSX), consultation (67), patients (75), appointments (42), subscription (42), public-booking (38), patient-portal (36), dashboard (35), auth (30), invoices (29).

### Feature completeness (deeper view)

| Dimension | Features | % |
|---|---|---|
| Has pages (`pages/*.tsx`) | 37 | **82%** |
| Has tests (`*.test.*`) | 38 | **84%** |
| Has hooks (`use-*.ts`) | 27 | **60%** |
| Has helpers (`*-helpers.ts`) | 20 | **44%** |
| Features WITHOUT tests | 7: billing-locked, errors, follow-ups, today, tools, upgrade, verify-email | — |

**Test density by feature** (tests / non-test source files):

| Feature | Tests | Source | Coverage ratio | Risk |
|---|---|---|---|---|
| whatsapp | 3 | 8 | 37.5% | Low |
| daybook | 2 | 7 | 28.5% | Low |
| auth | 9 | 35 | 25.7% | Low |
| dashboard | 11 | 44 | 25.0% | Low |
| documents | 2 | 12 | 16.6% | Medium |
| medical-coding | 1 | 6 | 16.6% | Medium |
| appointments | 15 | 95 | 15.7% | Medium |
| invoices | 6 | 38 | 15.7% | Medium |
| lab-tests | 4 | 27 | 14.8% | Medium |
| ipd | 2 | 14 | 14.2% | Medium |
| settings | 7 | 106 | **6.6%** | High |
| patients | 7 | 108 | **6.4%** | High |
| consultation | 6 | 145 | **4.1%** | **Critical** |
| subscription | 1 | 73 | **1.3%** | **Critical** |
| public-booking | 1 | 61 | **1.6%** | **Critical** |
| setup | 0 | 90 | **0%** | **Critical** |

## 2. API — 29 domains + 34 shared capability modules

Domains (`apps/api/src/domains/`): abdm, analytics, appointments, billing, clinical, clinics, custom-fields, dashboards, doctor-clinics, doctors, documents, enterprise-contracts, feedback, insurance-claims, inventory, ipd, lab-portal, leave, medical-documents, patient-portal, patients, payments, prescriptions, public-booking, reminders, subscriptions, users, webhooks, whatsapp.

Shared capability modules (`apps/api/src/shared/modules/`): ai, ai-core, audit, auth, cache, clinic-workspace, compliance, config, contact, database, document-generation, ephemeral-store, error-handling, feature-flags, fhir, idempotency, imports, internal, messaging, monitoring, observability, outbox, performance, public, queue, rls, schedule, search, services, support-whatsapp, tenant-rate-limit, time, webhooks, whatsapp-broadcast.

### Feature → API domain mapping (P0/P1 surfaces)

| Frontend feature | API domains consumed | Notes |
|---|---|---|
| today/dashboard | dashboards, appointments, patients | dashboard metrics + day agenda |
| appointments | appointments, reminders | calendar, queue, requests, tokens |
| consultation | clinical, prescriptions, patients | SOAP, vitals, medications |
| invoices / daybook / desk | billing, payments | 5-state invoice model, settlements |
| insurance-claims | insurance-claims, invoices | status machine in `@workspace/types` |
| lab-tests / lab-portal | lab-portal, clinical | orders → results → WhatsApp release |
| subscription | subscriptions, payments | Razorpay checkout chain, grace/lockout |
| ai-assistant | ai, ai-core | prescription/diagnosis assistants |
| patient-portal | patient-portal, patients, billing | OTP auth, history, consent |
| public-booking | public-booking | referral-code booking + Turnstile |
| whatsapp / inbox | whatsapp, messaging, support-whatsapp | campaigns, templates, delivery |

## 2.5 API Surface Metrics — measured 2026-08-02

| Metric | Count |
|---|---|
| Controllers (domains + shared) | 132 (91 domain + 41 shared) |
| Route handler methods | 639 |
| Zod schema files in `packages/types/src` | 114 |
| Named exported Zod schemas | 840 (`export const XSchema =` in types/src; 445 `z.object`) |
| DTO files in API | 59 (346 `createZodDto()` call sites) |
| Zod-first compliance (10-controller sample) | 10/10 — all use `createZodDto()` wrapping `@workspace/types` schemas |
| Source lines (apps/api/src) | 200,492 |
| Source lines (apps/app-vite/src) | 121,121 |
| Controllers with `@Roles` | 74 (56% of 132) |
| Controllers with `@Public` | 31 |
| Controllers without explicit auth decorator | 32 (protected by global 9-guard pipeline) |
| Controllers >200 lines | 10 (largest: ai.controller 247, join-requests 243, invoices 239) |
| Services >400 lines | 3 (database-control 474, database-rds 469, base-pdf 421) |
| API avg test-to-src ratio | **25%** (analytics 45%, patient-portal 35%, appointments 33%) |
| API unit tests | 381 across 29 domains |
| Top domain by routes | clinics (52), whatsapp (49), patients (47), doctors (41), clinical (31) |

Top API domains by route count:

| Domain | Controllers | Routes | Key concerns |
|---|---|---|---|
| clinics | 9 | 52 | Settings, branding,工作-hours, staff |
| whatsapp | 13 | 49 | Campaigns, templates, sender, delivery |
| patients | 8 | 47 | CRUD, search, tags, medical history |
| doctors | 7 | 41 | Profiles, schedules,Specializations |
| clinical | 3 | 31 | SOAP notes, vitals, examination |
| appointments | 9 | 29 | Calendar, queue, requests, tokens |
| patient-portal | 5 | 28 | OTP auth, history, consent |
| subscriptions | 6 | 25 | Plans, billing, Razorpay integration |
| billing | 5 | 18 | Invoices, settlements, daybook |
| analytics | 2 | 18 | Reports, metrics, dashboards |

## 3. Internal portal (apps/internal-vite) — 17 features

dashboard (complete), users, admins, billing, analytics, payment-processing, enterprise-contracts, support, system-monitoring, broadcasts, feedback, pricing, doctors, logs, referrals, performance, audits — currently 55 files total; most features are 1-file shells pending Phase 7 of the porting plan (target 314+ files).

## 4. Gating model (single source: `packages/types/src/billing/tier.ts`)

- **5 canonical clinical tiers** (STARTER→ENTERPRISE) + 3 plan modes (FULL / FRONT_DESK / CORE). Front Desk is mode-only — `isFrontDeskPlanMode(tier, planMode)`; legacy FRONT_DESK tier enum values removed.
- **56 `Feature` enum values** → `FEATURE_TIER_MAP` → backend `assertClinicHasFeatureOrThrow` + frontend `<FeatureGate>` / `FeatureGate(Feature.X)`.
- **Per-clinic overrides** (boolean toggles, `OVERRIDABLE_FEATURES`) subordinate to mode blocks (`MODE_BLOCKED_FEATURES` evaluated first).
- Usage metering: `UsageRecord`/`UsageEvent` per [clinic, type, period] with overage pricing; subscription gates via `SubscriptionStatus` guard + `billing-locked` flow.
- Planned features (e.g. `ABDM_INTEGRATION`) render "coming soon" via `isFeatureGenerallyAvailable` — never a paywall.

## 5. Cross-cutting capabilities

| Capability | Where | Notes |
|---|---|---|
| i18n | `src/i18n` + messages en/hi | 47 namespaces × 2 locales, 1,885 keys each, parity-checked |
| PWA | manifest + offline.html (assets only) | SW registration not yet wired (Phase 8) |
| Telemetry | `@/lib/monitoring` → Sentry | same-origin proxy enforced by check |
| Sockets | `@/lib/socket` single client | socket.io, store-driven events |
| PDFs | api document-generation + queue | Postgres-backed queue, R2 storage |
| Search | shared `search` module | GlobalSearch across patients etc. |
| AI | `ai` + `ai-core` modules | OpenAI-backed; external-timeout checks |

## 6. Product surface summary (what a clinic actually runs on)

A clinician day: **today** agenda → **appointments** calendar/queue → **consultation** workspace (SOAP + vitals + prescriptions) → **invoices** → **daybook** reconciliation; front desk runs **desk** (collect-payment, floor panel) + **queue tokens**; ops run **inventory**, **follow-ups**, **whatsapp**, **analytics**, **medical-coding**, **templates**, **imports**; patients self-serve via **patient-portal** + **public-booking**; labs via **lab-portal**; partners via **referral-partner**. Missing from the product today: excel/ocr import content, feedback, and the 8 SHELL features (guided-tour, tools, today re-export, profile, upgrade, errors, billing-locked, pharmacy).

## 7. Known product gaps (evidence)

- Excel/OCR import flows never ported (port-or-drop pending, product sign-off).
- Feedback (app + internal) has no route.
- `AdvancedMetricsCharts` + `/reports` ported but not wired to a page.
- Specialty (dental charts) rendered through shell pages.
- ABDM integration is M1-capture + verification only (roadmap: M2/M3 — see FUTURE_FEATURE_REQUIREMENTS).
