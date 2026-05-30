# Docita — Next Steps & Future Plans (Phased Roadmap)

> **Status:** 2026-05-29 · Now-phase audited against the codebase 2026-05-30 (see [§0.1](#01-now-phase-status-verified-2026-05-30)) · Living roadmap · Owner: product + eng leads
> **Purpose:** Single forward view consolidating planning that was scattered across `docs/UpcomingPlans/`, `docs/product/`, `docs/compliance/`, `docs/operations/`, and memory. Links to source docs for detail rather than duplicating them.
>
> **Hard constraints (do not break):**
>
> - **DB schema is LOCKED (2026-03-22): additive-only migrations** — no drops/renames/data-loss; `pnpm db:migrate` only, never `db:push` in prod; pre-deploy RDS snapshot.
> - **Gating** via `hasFeatureAccess(Feature.X)` + `FEATURE_TIER_MAP`; no numeric tier comparisons; Front Desk is tier-only.
> - **No PHI in logs/Sentry**; secrets stored encrypted only; no plaintext tokens in responses.

## How to read this

Work is driven by three concurrent **business drivers**, and every item is tagged with the one it serves:

| Tag | Driver                              |
| --- | ----------------------------------- |
| 🚀  | Public-beta launch readiness        |
| 💰  | Enterprise / revenue expansion      |
| 🩺  | Feature breadth (clinical coverage) |
| ♻️  | Quality / tech-debt                 |
| 🔒  | Security / compliance               |

Sections are ordered **Business-first**, then each technical direction. Within every section, work is split across three phases:

- **Now** — next 1–2 sprints; beta-blocking. (Implementation tracked on the `next-phase` branch.)
- **Next** — Q3 2026; revenue/expansion + audit-program execution + security/compliance hardening.
- **Later** — Q4 2026+; breadth, India health-stack, infra scale, multi-quarter bets.

A consolidated cross-direction phase table is in [§14](#14-consolidated-phase-view-all-directions); the thin-domain completion matrix is in [§13](#13-thin-domain-completion-matrix).

---

## 0.1 Now-phase status (verified 2026-05-30)

A codebase audit on 2026-05-30 found that **most "Now" items were already shipped** (the May consolidation work landed more than the source docs implied). Legend: ✅ done · ◐ partly done / needs ops to finish · ⏳ genuine code gap (pending) · 🚫 ops-only · 🔢 blocked on a pricing/product number · 🔑 blocked on external credentials/spec · ⚠️ unsafe without cross-client rework.

**Progress: 16 of 28 tracked items done.**

### ✅ Done

- [x] `HOSPITAL` in ClinicTier enum
- [x] Additive-only migration rule (MIGRATION_NOTES + check)
- [x] G3 controller-RBAC · G11/G12 detectors · G13 job-idempotency
- [x] AI preview-tab labels · AI feature gating
- [x] PDF bearer-cap (signed URLs)
- [x] Motion-policy compliance
- [x] no-console / logger discipline
- [x] State-based account lockout
- [x] Cron-heartbeat bounded (no pruning needed)
- [x] Knip CSS `@import` allowlist
- [x] 5 billing-audit follow-ups
- [x] WhatsApp delivery reconciliation (worker sweep)
- [x] AI credit metering — config + balance helpers + usage recording (all 4 clinical endpoints)
- [x] OCR usage recording on `/ai/ocr/extract`
- [x] AI credit enforcement guard (fail-open, inert until priced)
- [x] WhatsApp deliverability signal (event hook for alerting)

### ◐ In progress / needs an input or ops run

- [ ] AI credit enforcement — 🔢 set per-tier allotment numbers to activate the (shipped) guard
- [ ] Onboarding/settings/upgrade redesign — land + deploy
- [ ] Ask AI per-route scope-chip audit
- [ ] RLS prod enforcement — 🚫 role-swap + flag flip
- [ ] Perf baseline commit + budget warn→fail
- [ ] A11y baseline capture + CI enforce
- [ ] Formalize staging env — 🚫

### ⏳ Pending (blocked on input)

- [ ] Refresh-token Item 4 — ⚠️ patient-portal cookie migration + sign-off
- [ ] Email bounce/complaint webhooks — 🔑 ZeptoMail payload + secret
- [ ] CI-gate frontend deploys — 🚫 Cloudflare creds
- [ ] India-first GTM dry-run — QA

### 🚫 Ops-only

- [ ] Alerting + on-call (PagerDuty/Slack)

---

## 0.2 Implementation findings & added next steps (2026-05-30)

This pass implemented several "Now" items and, in doing so, surfaced facts that
refine the roadmap and open new business opportunities.

### Findings that corrected the roadmap

- **The roadmap (built from planning docs) overstated what was pending.** ~10
  "Now" items were already shipped in the May consolidation: all guardrail
  checks, the `HOSPITAL` tier enum, account lockout, cron-heartbeat bounding,
  the Knip CSS allowlist, the additive-migration rule, and all 5 billing-audit
  follow-ups. **Process lesson: verify against code before scheduling.**
- **AI usage was never recorded.** `trackAICredits` was dead code — every other
  usage type has an `@OnEvent` trigger; AI had none. Now wired (see §4).
- **`UsageTrackingService` is event-driven** (`@OnEvent` on `WHATSAPP_MESSAGE_SENT`,
  `INVOICE_GENERATED`, etc.), and `shared/` modules may import `@/domains/*`
  (33 cases) — so cross-module telemetry is done via the event bus, not direct
  module coupling (avoids NestJS DI cycles).
- **Patient-portal OTP reads `refresh_token` from the response body**
  (`use-portal-otp-auth.ts`) — the single reason auth Item 4 can't ship as-is.
- **WhatsApp has two outbound stores** (the `WhatsappMessage` aggregate + a
  legacy `WhatsappLog` mirror); the new reconciliation sweep targets the legacy
  log, which is the one the webhook ingress keeps in sync.
- **Frontends are already CI-quality-gated** (`app-quality` job lints/typechecks/
  builds) — only the Cloudflare _deploy_ step is outside CI.

### Added next steps (new or refined)

**💰 Business / monetization**

- **Surface metered AI usage** — now that AI ops emit `AI_CREDITS_CONSUMED`, add
  an "AI credits" line to the billing usage dashboard + overage billing. This
  turns AI from an uncosted feature into a measurable cost/revenue lever and is
  the lead-in to the Intelligence add-on. _Decision needed:_ per-tier included
  allotment numbers (unblocks enforcement).
- **WhatsApp deliverability as a selling point** — build a deliverability
  dashboard + SLO on top of the new reconciliation sweep; decide the terminal
  semantics for a stuck message (mark `FAILED` vs a softer `STALE`/alert-only)
  and emit the signal to alerting.
- **Sequence thin-domain build-out (§13) by hospital/enterprise revenue** — IPD →
  pharmacy → labs, since HOSPITAL/ENTERPRISE tiers are the monetization target.

**🩺 AI**

- ✅ Streaming `ask` endpoint now records usage too (2026-05-30); **OCR
  remains** — map the OCR endpoint to an `AI_CREDIT_COSTS` key without
  double-counting the existing `OCR_PAGE_PROCESSED` event.
- Ship the fail-open pre-call guard (compose `getAiCreditAllotment` +
  `computeAiCreditBalance`) once allotments are set; add an "AI credits
  remaining" surface in the app.
- Build the genuinely-planned AI services the Insights/Smart-tasks previews
  advertise — **no-show prediction first** (highest operational value).

**🔒 Security / compliance**

- **Refresh-token Item 4** — migrate patient-portal OTP to cookie-only, then drop
  the body token + add rotation lineage on `RefreshToken` (it already has
  `tokenFamily`); validate via the auth e2e suite.
- **Email deliverability** — ZeptoMail bounce/complaint webhook → a suppression
  list (needs the provider payload + signing secret).

**⚡ Perf / observability**

- **Wire alerting / on-call** — the biggest reliability gap; route the new
  WhatsApp reconciliation warnings + cron heartbeats into it.
- Commit a CI-representative perf baseline and flip the budget `warn → fail`.

---

## 0.3 Business & product expansion (added 2026-05-30)

New opportunities surfaced while implementing the Now-phase work. Grouped by
theme; each is a roadmap candidate, not yet scheduled.

### 💰 Revenue / monetization

- [ ] Surface metered AI usage in the billing usage dashboard + overage; package the **Intelligence add-on**; set per-tier AI allotments to switch on the (already-shipped) enforcement guard.
- [ ] Branded WhatsApp (BYO/MANAGED sender) as the **Professional/Hospital upsell**.
- [ ] Activate annual + loyalty pricing in checkout (`DiscountType` ANNUAL_COMMITMENT / LOYALTY_1/2/3 already exist) to lift ARPU + retention.
- [ ] Bill inventory / pharmacy / lab-orders for the HOSPITAL tier.
- [ ] Make storage / branch / seat overages legible in the usage recommender.

### 📈 Growth / acquisition

- [ ] Activate the **dormant referral program** (`Referral` / `ReferralCredit` models exist, no workflow): invite link, credit auto-apply at signup, referral dashboard.
- [ ] Instrument the **onboarding → paid conversion funnel** (find drop-off steps).
- [ ] Lean into India-first organic growth: WhatsApp-shareable digital Rx / invoice / payment links as acquisition surfaces.

### 🔁 Retention / engagement

- [ ] Patient-portal engagement: medication adherence, self-serve follow-up booking, record/doc access; telemedicine upsell.
- [ ] No-show reduction ROI: ship predictive no-show + reminders, quantify saved revenue.
- [ ] NPS / feedback loop (feedback domain) → close-the-loop + reviews/reputation.

### 🩺 Features (clinical breadth) — sequence §13 thin-domains by tier revenue

- [ ] IPD: discharge summary + bed map (hospital tier).
- [ ] Pharmacy dispensing workflow + inventory decrement.
- [ ] Lab external-lab integration + result import; abnormal-value flagging.
- [ ] Vaccines schedule + due reminders; referrals workflow.

### 🇮🇳 India differentiators / compliance

- [ ] ABHA/ABDM health-stack linking + e-invoice IRN — hospital/enterprise unlock + regulatory.
- [ ] Data-residency / DPDP posture (RLS enforcement, audit export) as enterprise trust signals.

### 🔒 Security

- [ ] Refresh-token Item 4 (cookie migration) · WebAuthn/passkeys (Item 5) · KEK re-wrap (Item 8) · webhook-secret rotation (Item 9).
- [ ] Email suppression list from bounce webhooks.

### ⚡ Performance

- [ ] Commit a CI-representative perf baseline + flip budget warn→fail · Web Vitals tracking · Lighthouse-in-CI · RDS read replica for analytics · Redis cache layer.

### ♻️ Code quality

- [ ] WS-2/3/4/5 SOLID/DRY splits · enforce file-size budget · consolidate types/hooks/utils · kill inline fetches · commit a visual-regression baseline.

### 📊 Observability

- [ ] Alerting / on-call · metrics export (Prometheus) · SLO/SLIs · WhatsApp **deliverability dashboard** off the new sweep + `WHATSAPP_DELIVERY_STALE` signal.

---

## 1. Business (primary)

### Now — 🚀 beta launch readiness

- [ ] **Ship the onboarding / settings / upgrade redesign** — feature-complete but uncommitted: QR-based SLA signature, doctor-verification gate (`/verify-doctor`), subscription-expiry guard → `/upgrade`, dynamic pricing on the payment step. Land → verify → deploy.
- [ ] **Close the 5 billing-audit follow-ups** ([BILLING_AND_GATING_AUDIT_2026-05-07.md](../product/BILLING_AND_GATING_AUDIT_2026-05-07.md)): specialty-page matrix alignment, settings-tab visibility checks, comparison-table sorting by published ladder (not numeric), PLANNED-feature copy consistency, `APP_ACCESS_MATRIX` as single source of truth.
- [ ] **India-first GTM dry-run** ([INDIA_FIRST_EXECUTION.md](../product/INDIA_FIRST_EXECUTION.md)): validate the 4-step demo (import → queue → digital Rx → invoice/follow-up) on refreshed seed data; enforce honest "live vs planned" copy — no unsupported certification or ABHA claims while those remain stubs.

### Next — 💰 revenue & monetization

- [ ] **Enterprise WhatsApp identity** (Feature 1, [feature-to-add-their-warm-valley.md](../UpcomingPlans/feature-to-add-their-warm-valley.md)): three sender modes — SHARED (default, all tiers), BYO (`Tier.PROFESSIONAL`), MANAGED (`Tier.HOSPITAL`); new `Feature.WHATSAPP_OWN_NUMBER` / `WHATSAPP_MANAGED_NUMBER`. Ship behind flags, SHARED-first.
- [ ] **Dynamic enterprise pricing** (Feature 2, Phase A): overage billing for doctors / prescriptions / invoices / consultations; `EnterpriseContract` line items + internal-portal contract editor + invoice preview.
- [ ] **Tier × Mode packages** ([CUSTOM_PACKAGES.md](../product/CUSTOM_PACKAGES.md)): finish FULL / FRONT_DESK / CORE mode blocks with a single pre-override mode check; verify no bypass via stale `Clinic.features`.
- [ ] **Operationalize the AI credit system** (see [§4](#4-ai--intelligence)): credits are scaffolded (`AI_CREDIT_COSTS`, 8 ops) but **not enforced** — quota enforcement, usage meter, and low-credit warnings are required before AI becomes a paid lever.

### Later — 💰🩺 expansion & differentiation

- [ ] **Whitelabel / branding** (Feature 2, Phase B): `brandingConfigSchema`; custom domain behind `Feature.DEDICATED_DEPLOYMENT`.
- [ ] **Internationalization** ([I18N_PLAN.md](../UpcomingPlans/I18N_PLAN.md)): `next-intl`, Hindi + one regional language; decide URL strategy (segment vs cookie). Direct India-market reach lever.
- [ ] **India health-stack differentiators** (see [§5](#5-integrations)): ABHA/ABDM linking + e-invoice IRN — regulatory/market unlocks for larger clinics and hospitals.
- [ ] **Per-clinic infra credentials + dedicated deployment** (Feature 2, Phases C/D): gated on the first enterprise customer.

---

## 2. Database

> All items additive-only. `pnpm db:migrate` with pre-deploy RDS snapshot; `verify-db-schema-sync.sh` blocks drift.

### Now

- [ ] **Add `HOSPITAL` to the DB `ClinicTier` enum** — prerequisite for MANAGED WhatsApp + hospital contracts (today only PROFESSIONAL/ENTERPRISE map cleanly).
- [ ] **Codify the locked-schema rule** in the migrations README + CI (additive-only, no `db:push` in prod). See [MIGRATION_HISTORY.md](../operations/MIGRATION_HISTORY.md).

### Next (all additive)

- [ ] **WhatsApp sender storage**: `WhatsappSenderMode` / `WhatsappSenderStatus` enums; `ClinicSecret` rows for encrypted Meta tokens (ciphertext only — never plaintext in logs/Sentry); `Clinic` sender fields.
- [ ] **Enterprise pricing dimensions**: new `UsageType` values (`DOCTORS`, `PRESCRIPTIONS`, `INVOICES`, `CONSULTATIONS`); `EnterpriseContract` columns (included counts, per-unit overages, setup/support fees, `customLineItems` JSON).
- [ ] **Per-tenant audit retention**: `ClinicSettings.auditRetentionDays` (defaults 180d general / 365d billing / unlimited compliance-flagged) — unblocks [§7](#7-compliance--privacy-phi--dpdp--rls) retention work.

### Later

- [ ] **Domain build-out models** (additive, paired with [§3](#3-backend-platform--core-domains) / [§13](#13-thin-domain-completion-matrix)): IPD discharge/charges/timeline, Inventory PurchaseOrder/Supplier/GRN, Pharmacy dispense, Vaccine schedule, Lab panels/external-lab, Daybook, MedicationRefillRequest, Referral workflow tables.
- [ ] **Branding config + per-clinic infra-credential rows** (extend `ClinicSecret`).
- [ ] **Searchable-PHI strategy**: deterministic-hash shadow columns if encrypting currently-plaintext lookup fields (`mrn`, etc.) — design first.
- [ ] **Read-path indexes**: additive indexes on hot multi-tenant queries (appointments, queue, invoices, analytics) — paired with [§8](#8-performance) query-plan review.

---

## 3. Backend (platform & core domains)

> Core domains (appointments, billing, clinical, prescriptions, patients, doctors, whatsapp, subscriptions) are production-ready with strong specs. Focus: hardening invariants, SOLID splits, and finishing thin domains ([§13](#13-thin-domain-completion-matrix)).

### Now — 🚀 beta-blocking invariants

- [ ] **G3 controller RBAC posture**: every controller declares an explicit auth posture; land `check-controller-rbac.mjs` in CI. Backstops the tenant-isolation story.
- [ ] **G11/G12 security detectors**: webhook HMAC (already verified for Razorpay/Meta — codify), upload validation, public-endpoint rate limits; audit logging at the command boundary; **no PHI in Sentry** (`check-audit-logging.mjs`, `check-sentry-scrubbing.mjs` — partly present, extend to value-level coverage).
- [ ] **G13 job idempotency**: every QueueJob / scheduler processor declares retry + idempotency (`check-job-idempotency.mjs`). The transactional outbox already exists — codify the invariant.

### Next — ♻️ SOLID + revenue plumbing

- [ ] **WS-2 backend SOLID** ([security-and-performance-audit-merry-lobster.md](../UpcomingPlans/security-and-performance-audit-merry-lobster.md)): split ~14 services >400 lines via CQS — e.g. `appointment.service.ts` (945L) → Command/Query/Rules; `invoices.service.ts` (773L) → Command/Query/Calculator. Parallelize sequential reads in `medical-history.service.ts`.
- [ ] **WhatsApp `WhatsappSenderResolver`** + adapter refactor + webhook routing by `phone_number_id` (fall back to global); BYO token lifecycle (validate permanent tokens, alert at T-30d).
- [ ] **Enterprise usage events**: prescription/invoice creation → usage tracking; consultation-completion event (distinct from appointment); nightly active-doctor count job.
- [ ] **Durable background jobs**: the PG-`QueueJob` queue is best-effort and fragile on worker restart — harden retry/dead-letter or evaluate a durable backend (Redis/BullMQ). Pairs with [§10](#10-devops--infra--ci-cd) infra.

### Later — 🩺 breadth + tests

- [ ] **Complete thin domains** per [§13](#13-thin-domain-completion-matrix) (IPD, Inventory, Patient-portal, Leave, Referrals, Vaccines, Pharmacy, Daybook, Lab external integration, Feedback loop, unified Inbox).
- [ ] **Test coverage for 0-test domains**: `ipd`, `public-booking`, `enterprise-contracts`; raise `webhooks`/`medical-documents` from minimal. Add specs alongside each feature build (WS-9).

---

## 4. AI & Intelligence

> **Live today (OpenAI-backed, streaming):** Ask AI chat, prescription analysis (interactions/contraindications), diagnosis hints (ICD-10), medication recommendations, document OCR (GPT-4 Vision). Code under `apps/api/src/shared/modules/ai/*`, frontend `apps/app/features/ai-assistant/*`. Search is Postgres `tsvector` (no semantic/vector). `Tier.INTELLIGENCE` is a reserved $0 add-on placeholder.

### Now

- [ ] **🚀 Honesty + gating audit**: confirm AI features are correctly gated (`Feature.AI_PRESCRIPTION_ASSISTANT` / `AI_DIAGNOSIS_HINTS` etc. → ESSENTIAL) and that stubbed tabs (**Insights**, **Smart Tasks**) are clearly labeled "coming soon," not presented as live.
- [ ] **🚀 Cost/abuse guardrails**: AI endpoints are rate-limited but **credits aren't enforced** — add a hard quota check + LLM spend logging before broader rollout.

### Next

- [ ] **💰 Credit system GA** (ties to [§1](#1-business-primary)): quota enforcement, usage dashboard, low-balance warnings; define what the **Intelligence add-on** actually grants (currently $0 / undefined).
- [ ] **🩺 Ship the planned AI services** that already have features + credit costs but no implementation: **no-show prediction** (`PREDICTIVE_NO_SHOW`), **anomaly detection**, **risk/patient segmentation** (PROFESSIONAL). Start with no-show (highest operational value).
- [ ] **♻️ LLM provider strategy decision**: today 100% OpenAI with no fallback. Decide on a provider abstraction + fallback/redundancy and the PHI-handling posture at the LLM boundary (no PHI leakage; document data-processing terms).

### Later

- [ ] **🩺 Voice-to-text transcription** (credit cost defined, no impl) for clinical notes.
- [ ] **🩺 Semantic / vector search** over notes/symptoms (current tsvector won't do similarity) — needs an embeddings + vector-store decision.
- [ ] **🩺 Clinical-note generation/summarization** and **auto-coding suggestions** surfaced inline in the SOAP workspace.

---

## 5. Integrations

> Live: Razorpay (orders, links, refunds, subscriptions, webhooks w/ HMAC), Meta WhatsApp (SHARED text/template/interactive), ZeptoMail email, Cloudflare R2 storage, OCR pipeline, prescription PDF. Config via Fly secrets.

### Now — 🚀

- [ ] **WhatsApp delivery reliability**: add delivery/read-status reconciliation (status webhook is received but no historical polling) and harden the broadcast/bulk path.
- [ ] **Email deliverability**: wire ZeptoMail bounce/complaint webhooks; today there is no delivery-status feedback loop.

### Next — 💰

- [ ] **WhatsApp BYO/MANAGED sender modes** (pairs with [§1](#1-business-primary)/[§2](#2-database)/[§3](#3-backend-platform--core-domains)) — the revenue feature.
- [ ] **Razorpay clinic Flow B**: clinic-merchant payment provider for patient invoices (`CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN` exists; clinic-credential wiring is a TODO). Lets clinics collect into their own accounts.
- [ ] **SMS provider** (currently a stub; `smsNotifications` flag unused): integrate an India provider (MSG91 / Exotel / AWS SNS) as a reminder fallback channel — important where WhatsApp opt-in is missing.
- [ ] **PDF breadth**: invoice PDF (today Razorpay-hosted only), discharge summary, lab report — with clinic letterhead/branding templating.

### Later — 🩺 India health stack (differentiators)

- [ ] **e-Invoice / GST IRN** (currently stubbed; **critical compliance gap for larger clinics**): IRN generation + QR via NIC IRP or a GSP, HSN/SAC master sync, e-way bill for IPD transfers. GST line-item split already works.
- [ ] **ABHA / ABDM** (currently a stored `abhaAddress` field only; **major India-market gap**): ABHA creation/linking, PHR consent manager, HIP/HIU record exchange, ABDM HPR for doctor verification (stub noted in `doctor-verification.service.ts`).
- [ ] **OCR maturity**: auto-retry on failures, batch re-processing of low-confidence docs, OCR cost/usage monitoring.
- [ ] **External lab integration** ([§13](#13-thin-domain-completion-matrix)): order submission + result webhook import (Metropolis/Thyrocare), result normalization, abnormal-value flagging.
- [ ] **Calendar sync** (Google/Outlook/iCal) — not started; doctor convenience feature.

---

## 6. Security & Auth

> Strong baseline: AES-256-GCM PHI field encryption at the Prisma boundary (coverage-checked), TOTP MFA, hashed/rotated refresh tokens with reuse detection, password policy, magic-byte upload validation, HMAC webhook verification, ~10 security checks in `pnpm verify:standard`. Roadmap items tracked in [AUTH_HARDENING.md](../compliance/AUTH_HARDENING.md) (Items 3/4/5/8/9) and [KEY_ROTATION.md](../operations/KEY_ROTATION.md).

### Now — 🚀

- [ ] **Item 4 — stop returning unhashed refresh tokens** in any response/error path; single-transaction rotate with `Session.replacedByHash` (`auth-session.service.ts`).
- [ ] **State-based account lockout**: `User.failedLoginAttempts` / `accountLockedUntil` fields exist but enforcement is throttle-based only — wire actual lockout + password history/expiry enforcement.
- [ ] **Item 3 — session-bound signed URLs** for PDFs (HMAC of `sessionId + url + nonce`); `check-pdf-bearer-cap.mjs` must pass.

### Next — 🔒

- [ ] **Item 9 — rotating webhook secrets** with overlap windows (`*_WEBHOOK_SECRET_VERSIONS` JSON; verifier tries all active versions) for Razorpay + Meta.
- [ ] **Item 8 — automated KEK rotation**: env scaffold (`ENCRYPTION_KEY_V2..V5`) exists; ship the re-wrap scheduler that migrates old-key data forward, with audit logging. See [KEY_ROTATION.md](../operations/KEY_ROTATION.md).
- [ ] **Item 5 — WebAuthn/passkey MFA**: `WebAuthnCredential` model + `/auth/webauthn/*` endpoints + settings UI + recovery codes.

### Later — 🔒

- [ ] **Upload hardening**: Content-Type check before magic-byte, image-dimension limits (DoS), optional malware scanning.
- [ ] **Per-clinic API rate limits**: wire `ClinicApiQuota` (schema exists) to HTTP handlers; queue-depth limits on bulk import. See [RATE_LIMITS.md](../operations/RATE_LIMITS.md).
- [ ] **KMS integration** for key material (today env-var + Fly secrets); scheduled secret rotation ([SECRET_ROTATION_CHECKLIST.md](../operations/SECRET_ROTATION_CHECKLIST.md)).

---

## 7. Compliance & Privacy (PHI / DPDP / RLS)

> DPDP framework live: consent capture (versioned notices), `DataSubjectRequest` (access/correction/erasure with anonymization), `AuditLog` (PHI-scrubbed), data-retention scheduler (global windows). RLS migration is in place but **not enforced**. See [RLS_ROLLOUT.md](../compliance/RLS_ROLLOUT.md), [PHI_ENCRYPTION_POLICY.md](../compliance/PHI_ENCRYPTION_POLICY.md), [ACCESS_AUDIT.md](../compliance/ACCESS_AUDIT.md), [AUDIT_EXPORT.md](../compliance/AUDIT_EXPORT.md).

### Now — 🚀 (highest-leverage compliance item)

- [ ] **Enforce RLS in production**: migration `20260502143500_add_rls_policies` + `TenantContextInterceptor` / `RlsService` are ready, but enforcement requires (1) provisioning the non-owner `docita_app` role (`packages/db/scripts/provision-docita-app-role.sql`), (2) pointing `DATABASE_URL` at it, (3) a staging dry-run with `RLS_ENABLED=true`, then (4) prod flip + 24h soak. **Until flipped, tenant isolation relies solely on app-layer scoping.**

### Next — 🔒

- [ ] **Per-tenant retention** (needs [§2](#2-database) `auditRetentionDays`): scheduler respects per-clinic windows + operator UI in `apps/internal`.
- [ ] **Consent revocation workflow**: today consent, once granted, persists unless an expiry is set — add revoke + gate-check on revocation.
- [ ] **PHI-in-logs value-level scrubbing**: the current check catches field _names_; extend to value patterns in stack traces.

### Later — 🔒

- [ ] **Regulator / audit export job** (designed in [AUDIT_EXPORT.md](../compliance/AUDIT_EXPORT.md), not shipped): worker processor, PHI-scrubbed, envelope-encrypted per clinic KEK, session-bound signed download.
- [ ] **DPIA tooling/template**; document-content encryption-at-rest in R2 (today relies on transport + provider-side at-rest).
- [ ] **India-specific**: ABHA/ABDM consent manager (pairs with [§5](#5-integrations)); PAN/Aadhaar validation if required.

---

## 8. Performance

> Per-route bundle budgets + Web-Vitals targets exist (`scripts/perf/route-budgets.config.mjs`); current routes are well under budget (dashboard 30.8 KB / 180 KB). Budget check runs in `warn` mode.

### Now — 🚀

- [ ] **Commit a clean perf baseline** (`pnpm perf:baseline` on stable main → `logs/performance/baseline.json`).
- [ ] **Promote budget mode `warn` → `fail`** so >15% route-size regressions block CI.

### Next — ⚡

- [ ] **WS-6 read parallelization** of sequential `findMany` calls + **React Query `staleTime`/`gcTime` audit** across hot pages.
- [ ] **Bundle analysis** (`ANALYZE=true`) per route vs budgets; trim the heaviest imports.
- [ ] **Web Vitals tracking**: wire `PERF_API_BASE_URL` into baseline collection; track LCP/INP/CLS against targets.

### Later — ⚡

- [ ] **Headless Lighthouse** in CI checking `ROUTE_WEB_VITALS`.
- [ ] **DB read scaling**: RDS read replica for analytics/reporting (trigger ~20+ clinics); query-plan review with [§2](#2-database) additive indexes.
- [ ] **Persistent cache layer**: the in-process cache is lost on restart — evaluate Redis for AI/search/auth-snapshot caches.

---

## 9. UI/UX

> Authority: [UI_UX_STANDARD_2026.md](../ui/UI_UX_STANDARD_2026.md) (Origin-inspired). Strict motion policy, sidebar IA (TRACK/SERVICES + pinned Ask AI), `AppPageScaffold` → `PageHeader` → `DataState`, OKLCH tokens. ~117 `@workspace/ui` primitives.

### Now — 🚀 beta-blocking

- [ ] **A11y sweep across all TRACK/SERVICES routes** (not the current subset) via `apps/app/e2e/accessibility.spec.ts`; fix critical/serious Axe issues; **commit the a11y baseline** (`artifacts/a11y-baseline.json`, G14) and enforce in CI.
- [ ] **Motion-policy compliance** (standard §5): remove banned decorative `animate-in` / `transition-all`; keep only `animate-spin` + `transition-colors duration-150`. Spot-check onboarding/auth.
- [ ] **Ask AI surface completeness**: pinned affordance + scope chips on Today, patient detail, consultation, appointments.

### Next — 🎨

- [ ] **Remove app-local `@workspace/ui` duplicates** (empty-state, back-button); delete the stale `sidebarItems` constant; enforce the sidebar IA.
- [ ] **WS-3 frontend SOLID**: split 9 components >700 lines (`public-booking-form-sections.tsx` 1374L, `sidebar.tsx` 826L) into sections + hooks.
- [ ] **DataState rollout**: migrate ~656 ad-hoc `isLoading/isEmpty/error` sites to page-level `DataState`.

### Later — 🎨

- [ ] **Post-launch polish build** ([post-launch-polish.md](../UpcomingPlans/post-launch-polish.md)): 23 designed clinic-OS screens (SOAP chart, Rx w/ drug search + allergy alerts, week calendar, reception queue/floor panel, daybook, IPD bed map), mobile companion kit, landing brand refresh.
- [ ] **Exercise `compact`/`spacious` density** on consultation/patients/appointments; audit `design-tokens.ts` vs `globals.css` drift.

---

## 10. DevOps / Infra / CI-CD

> Fly.io (Mumbai) API + worker, AWS RDS PG16 (7-day backups), Cloudflare R2 + Workers (OpenNext). GHA selective deploys, additive migrations w/ pre-deploy snapshot, blue-green API, synthetic probes, blue-green rollback runbook. See [DEPLOYMENT.md](../operations/DEPLOYMENT.md), [STAGING.md](../operations/STAGING.md), [STAGING_AND_CI.md](../operations/STAGING_AND_CI.md), [DR_RUNBOOK.md](../operations/DR_RUNBOOK.md).

### Now — 🚀

- [ ] **Formalize the staging environment** ([STAGING.md](../operations/STAGING.md) exists; complete it): dedicated Fly apps + RDS snapshot/replica + env-var guards so prod secrets/config can't leak into staging. Needed to safely dry-run RLS ([§7](#7-compliance--privacy-phi--dpdp--rls)) and releases.
- [ ] **CI-gate frontend deploys** (today manual via Cloudflare) to match the backend release gates.

### Next — 🔒♻️

- [ ] **Scheduler module split**: extract `@Cron` handlers into worker-only modules to cut API RSS and isolate scheduling.
- [ ] **Backup hardening**: cross-region snapshot copy, documented PITR runbook, periodic restore verification (snapshots are created but never tested). Extend [DR_RUNBOOK.md](../operations/DR_RUNBOOK.md).

### Later

- [ ] **RDS read replica + scale plan** (pairs with [§8](#8-performance)); evaluate a durable queue backend ([§3](#3-backend-platform--core-domains)).
- [ ] **Multi-region / failover** posture; load-balancer review.
- [ ] **IaC / Terraform + dedicated-deployment tooling** (Feature 2, Phase D — gated on the first enterprise customer).

---

## 11. Observability & Reliability

> Live: Pino structured logs + multi-layer PHI redaction, Sentry (API + frontend, PHI-scrubbed `beforeSend`, 10% trace sampling), `/health/live`, synthetic probes every 5 min, `@TrackHeartbeat` on crons, `SystemMetrics`/`AggregatedMetrics` rollups. See [SYNTHETIC_MONITORING.md](../operations/SYNTHETIC_MONITORING.md).

### Now — 🚀

- [ ] **Alerting + on-call**: synthetic probes log failures but there is **no PagerDuty/Slack alerting** — wire alerts for probe failure, error-rate spike, and missing cron heartbeat. Biggest reliability gap for beta.
- [ ] **Cron heartbeat pruning**: rows accumulate unbounded — schedule cleanup.

### Next

- [ ] **Metrics export**: `/metrics` (Prometheus) or push to Datadog/Grafana; today metrics live only in the DB.
- [ ] **SLO/SLI definitions** (availability, p99 latency) with error budgets.

### Later

- [ ] **APM / distributed tracing** (OpenTelemetry) across API → DB → R2 → webhooks.
- [ ] **Real-time dashboards** (Grafana/Datadog); expand synthetic probes to clinic-level e2e flows.

---

## 12. Code Quality & Hygiene

> ~41 boundary/invariant checks in `scripts/checks/`. Green: no-console (just landed), frontend-fetch ban, prisma boundary, parent-relative imports. Report-mode/pending: file-size budget (14 files >400L), Knip strict, type-duplicate consolidation. Workstreams from [security-and-performance-audit-merry-lobster.md](../UpcomingPlans/security-and-performance-audit-merry-lobster.md).

### Now — ♻️

- [ ] **Hold shipped wins**: confirm features use `@/lib/monitoring/logger`, not `console.*`; keep fetch-ban + prisma-boundary green.
- [ ] **Knip baseline** with CSS `@import` exceptions allowlisted (Knip misses `@fontsource/*` in `globals.css`) so drift is visible without false positives.

### Next — ♻️

- [ ] **WS-4 DRY consolidation**: app-local types → `packages/types`, hooks → `packages/hooks`, utils → `packages/utils`; eliminate ~64 inline `fetch()` calls in `apps/app` via data-access (G1/G2/G7/G8).
- [ ] **WS-5 cleanup**: residual `as any` / `@ts-ignore`, raw hex outside `globals.css`, `transition-all`, ad-hoc font-size literals.
- [ ] **WS-1 tier/role hygiene**: soft-deprecate unused `HospitalRole` (12 values) + 16 `Specialization` values (export active sets only); land `check-tier-comparisons.mjs` (G4/G9).

### Later — ♻️

- [ ] **Enforce `check-file-size-budget` (400L)** once the 14 oversized files are decomposed.
- [ ] **WS-8 docs**: keep [AGENTS.md](../../AGENTS.md) §15 Pattern Catalogue authoritative; per-package READMEs.
- [ ] **WS-9 test density**: feature-hook unit tests; commit the Playwright visual-regression baseline; sidebar-IA assertion.

---

## 13. Thin-domain completion matrix

> Build-out is the 🩺 breadth track (mostly **Later**, with additive DB + tests alongside). Completion estimates from code exploration.

| Domain                 | ~Done | Top gaps → next steps                                                                                                                         |
| ---------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Patient portal**     | 60%   | Med-refill request workflow, appt reschedule/cancel from portal, lab-result access, pre-visit forms, in-portal bill pay, document upload      |
| **Leave**              | 50%   | Accrual job, carry-over enforcement, **DoctorTimeOff sync on approval**, approval hierarchy, encashment, lapsed-leave report                  |
| **Follow-ups / Inbox** | 45%   | Unified inbox view, reminder cron, patient-initiated requests, smart (AI) follow-up suggestions, completion SLA dashboard                     |
| **IPD**                | 40%   | Discharge summary PDF, bed-allocation rules, occupancy dashboard, `AdmissionCharge` billing, LOS + readmission tracking, transfer audit trail |
| **Feedback**           | 40%   | Post-appointment trigger, NPS, sentiment analysis, action board, doctor/department aggregation, trend reports                                 |
| **Lab tests**          | 35%   | External-lab API + result webhook import, panels/combos, abnormal-value flagging, formatted report PDF, portal exposure, TAT tracking         |
| **Inventory**          | 30%   | Supplier + PurchaseOrder + GRN, reorder automation, batch/expiry alerts, reconciliation, FIFO costing, aging report                           |
| **Pharmacy**           | 15%   | `PharmacyDispense` + counter UI, inventory decrement, med-label PDF, drug-interaction check, controlled-substance audit                       |
| **Referrals**          | 10%   | Full workflow: invite endpoint + email, signup referralCode capture, credit auto-apply into billing, analytics dashboard                      |
| **Vaccines**           | 10%   | `VaccineSchedule`, due-date calc + reminder cron, certificate PDF, inventory link, portal history, AEFI tracking                              |
| **Daybook**            | 0%    | Build `DayBook`/`DayBookEntry`, daily aggregation + reconciliation, register UI, end-of-day close                                             |

---

## 14. Consolidated phase view (all directions)

| Phase                                  | Headline themes                                   | Representative items                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Now** (🚀 beta hardening)            | Launch readiness, isolation, baselines, alerting  | Ship onboarding redesign; billing-audit fixes; **enforce RLS in prod**; controller-RBAC + security detectors; refresh-token Item 4 + account lockout; commit & CI-enforce perf + a11y baselines; **wire alerting/on-call**; staging env; Knip baseline; `HOSPITAL` tier enum; AI gating/credit guardrails                                          |
| **Next** (💰 revenue + ♻️🔒 hardening) | Monetization, SOLID/DRY, security depth           | Enterprise WhatsApp (SHARED→BYO→MANAGED); dynamic enterprise pricing Phase A; tier×mode packages; AI credit GA + no-show prediction; WS-2/3/4/5 splits; webhook-secret rotation + KEK re-wrap + WebAuthn; per-tenant retention + consent revocation; read parallelization + Web Vitals; SMS + Razorpay Flow B + invoice PDF; metrics export + SLOs |
| **Later** (🩺 breadth + 🌍 scale)      | India health stack, domain build-out, infra scale | Thin-domain completion ([§13](#13-thin-domain-completion-matrix)) + tests; **ABHA/ABDM + e-invoice IRN**; whitelabel + i18n; semantic search + voice transcription; APM/tracing + dashboards; RDS replica + durable queue + multi-region; dedicated deployment; post-launch 23-screen build; file-size enforcement                                 |

---

## 15. Guardrails (do-not-break)

- Migrations **additive-only**; `pnpm db:migrate`, never `db:push` in prod; pre-deploy snapshot.
- Gating via `hasFeatureAccess(Feature.X)` + `FEATURE_TIER_MAP`; no numeric tier comparisons; Front Desk tier-only.
- **No PHI in logs/Sentry**; secrets encrypted only (`ClinicSecret` / encryption service); no plaintext tokens in responses.
- New surfaces assembled from `@workspace/ui`; no `../` imports in code; no `console.*`; Zod-first types in `packages/types`.
- Every PR passes `pnpm verify:standard`; work on a branch cut from `main` (never `main`/`staging`).

---

### Source documents

- Product: [INDIA_FIRST_EXECUTION.md](../product/INDIA_FIRST_EXECUTION.md) · [CUSTOM_PACKAGES.md](../product/CUSTOM_PACKAGES.md) · [BILLING_AND_GATING_AUDIT_2026-05-07.md](../product/BILLING_AND_GATING_AUDIT_2026-05-07.md)
- Upcoming plans: [feature-to-add-their-warm-valley.md](../UpcomingPlans/feature-to-add-their-warm-valley.md) · [security-and-performance-audit-merry-lobster.md](../UpcomingPlans/security-and-performance-audit-merry-lobster.md) · [I18N_PLAN.md](../UpcomingPlans/I18N_PLAN.md) · [post-launch-polish.md](../UpcomingPlans/post-launch-polish.md)
- Compliance: [AUTH_HARDENING.md](../compliance/AUTH_HARDENING.md) · [PHI_ENCRYPTION_POLICY.md](../compliance/PHI_ENCRYPTION_POLICY.md) · [RLS_ROLLOUT.md](../compliance/RLS_ROLLOUT.md) · [AUDIT_EXPORT.md](../compliance/AUDIT_EXPORT.md) · [ACCESS_AUDIT.md](../compliance/ACCESS_AUDIT.md)
- Operations: [DEPLOYMENT.md](../operations/DEPLOYMENT.md) · [STAGING.md](../operations/STAGING.md) · [DR_RUNBOOK.md](../operations/DR_RUNBOOK.md) · [KEY_ROTATION.md](../operations/KEY_ROTATION.md) · [RATE_LIMITS.md](../operations/RATE_LIMITS.md) · [SYNTHETIC_MONITORING.md](../operations/SYNTHETIC_MONITORING.md) · [SECRET_ROTATION_CHECKLIST.md](../operations/SECRET_ROTATION_CHECKLIST.md)
- Standards: [UI_UX_STANDARD_2026.md](../ui/UI_UX_STANDARD_2026.md) · [AGENTS.md](../../AGENTS.md) §15
