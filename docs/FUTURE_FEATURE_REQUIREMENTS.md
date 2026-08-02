# Future Feature Requirements — Grounded in Existing Plans

Point-in-time: **2026-08-01**. Every requirement below traces to a tracked plan, a compliance roadmap, an audit finding in this analysis series, or a validated product gap. Nothing speculative; effort ratings are relative to the current team size.

## 1. ABDM / India compliance — the biggest committed roadmap

Source: `docs/UpcomingPlans/india-compliance-and-abdm-roadmap.md` + `docs/compliance/DPDP_READINESS.md`.

| Feature | Requirement (MVP) | Effort |
|---|---|---|
| **ABDM M1** (in progress) | ABHA address + consent-let flow (consent manager, HIUs); patient webview authorization via `patient-portal` audience | Medium |
| **ABDM M2** (planned) | Health records push/pull (HIE-CM): prescriptions, lab reports, discharge summaries as FHIR bundles; link care-contexts to ABHA | Large |
| **ABDM M3** (later) | Appointment booking via ABDM, telemedicine, e-prescription (live `prescription` FHIR profile) | Large |
| **DPDP readiness** | Consent-first onboarding (done), 90-day audit retention (done), **per-tenant retention policy** (gap — `DATABASE_ANALYSIS.md` §3), privacy policy + support channel (done) | Small |

Existing foundation: `abdm` API domain (5 controllers), `Consent`/`ConsentTemplate` models, `loinc`/`cpt`/`icd` catalogs, FHIR profiles under `docs/architecture/`. **Recommended next commit**: ABDM M2 document-types groundwork (care-context ↔ ABHA linking).

## 2. Missing product surfaces (porting matrix: excel, ocr, feedback)

| Feature | Requirement | Notes |
|---|---|---|
| **Excel import/export** (Excel, 3 files ported 0/12) | Patient bulk import + appointments export via the existing bulk-import strategy registry; `packages/types` schemas exist | Medium |
| **OCR** (Ocr, 0/8) | Uploaded doc → text extraction for lab values; wrap provider behind strategy pattern (external-call contract already enforced) | Medium |
| **Feedback** (Feedback, 0/5) | In-app feedback modal → `Feedback` model + audit-safe storage; trigger on session end | Small |

These are the only three features with zero ported surface; everything else is port-complete or mid-port.

## 3. Post-launch polish (`docs/UpcomingPlans/post-launch-polish.md`, `docs/product/NOTIFICATIONS_*.md`)

| Feature | Requirement |
|---|---|
| WhatsApp broadcast templates | Approved template set per `WHATSAPP_BROADCAST_TEMPLATES.md`; batch send via `OutboxEvent` (idempotency already enforced) |
| Notification preference center | `NotificationPreferences` model exists (1:1, zero `@@index`) — needs UI surface in Settings |
| Guided tour (mid-port) | Per-role onboarding tour over the new AppShell |
| Settings feature completion | 24/128 files ported — the largest PARTIAL surface; finish before marketing claims "settings" |

## 4. Security roadmap (from `SECURITY_ANALYSIS.md` §6)

| Item | Requirement |
|---|---|
| React Router v7→**v8** | CSRF advisory GHSA-qwww-vcr4-c8h2; major bump — verify the 89-route tree, then gate with `perf:route-budgets` re-baseline |
| WebAuthn/passkeys | AUTH_HARDENING item 5 |
| KEK rotation automation | AUTH_HARDENING item 8 |
| PDF signed-URL bearer cap | AUTH_HARDENING item 3 |
| Webhook secret overlap | AUTH_HARDENING item 9 |

## 5. Frontend experience (from `UI_UX_ANALYSIS.md` §4, §8)

| Item | Requirement |
|---|---|
| **Dark mode** | Wire one store-driven provider in app-vite; rewire `ThemeToggleWithAppearanceSync`; drop `next-themes` from `packages/ui`; delete 2 dead files. Tokens are ready — this is an afternoon, not a project |
| i18n expansion | 47 namespaces × 2 locales (en/hi) fully synced; next locales need the same parity gate |
| Command palette parity | Must track sidebar IA in lockstep (STANDARD §1.1) |

## 6. Enterprise readiness (from DB + standards docs)

| Item | Requirement |
|---|---|
| Per-tenant retention | Enterprise contracts need retention windows per clinic — schema + scheduler change |
| RLS operator step | Run API as non-owner `docita_app` role; then `FORCE ROW LEVEL SECURITY` per table |
| Enterprise contract billing | `enterprise-contracts` domain exists (36-field model); payment/billing flows per `BILLING_AND_GATING_AUDIT` |

## 7. Infrastructure / hygiene (from COST + STANDARDS docs)

| Item | Requirement |
|---|---|
| Move live Razorpay key ID to CF secrets | REPO_GAPS §H.8 — do before any wrangler public diff |
| Remove stale `ignoreGhsas` entries | 4 entries (esbuild ×2, postcss, valibot — all patched), 5 min |
| Fix `DEPLOYMENT.md` region/scale drift | now says `sin` + scale-to-zero |
| Post-cutover: prune port history, `git gc` | 141 MB .git |
| `design-tokens.ts` fate | delete or regenerate from globals.css |

**Sequencing suggestion**: (1) dark mode + settings completion (visible product), (2) ABDM M2 groundwork + react-router v8 (compliance/security), (3) excel/ocr/feedback (surface completion), (4) enterprise retention + RLS step (revenue-facing). Cross-link: every item above is already quantified in its analysis doc; this file is the queue, not the research.
