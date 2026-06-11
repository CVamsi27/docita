# India Compliance & ABDM Roadmap

> **Status:** roadmap (design + sequencing). Produced by the [2026-06-10 full-repo audit](../audits/2026-06-10-full-repo-audit.md). Regulatory facts verified online 2026-06; re-verify dates before each phase kicks off.
> **Constraint:** DB schema is locked — every model below is **additive only**.

---

## 1. ABDM / ABHA integration (HIGH — multi-sprint)

### Why
- M1–M3 certification is becoming table-stakes in hospital/clinic software procurement.
- The Digital Health Incentive Scheme (DHIS) pays facilities ₹20 per ABHA-linked record above 100/month (cap ₹4 Cr) — a direct revenue argument in sales conversations.
- 840M+ ABHA IDs exist; Scan & Share OPD QR is live in large hospitals and increasingly expected.

### Current state
`Patient.abhaAddress` column + index ([schema.prisma:341,373](../../packages/db/prisma/schema.prisma)). **M1 capture foundation now wired** (2026-06-10): see "Delivered" below. Still missing: HFR/HPR registration, gateway-verified ABHA create/link, milestone flows, FHIR, consent manager.

### Delivered — M1 capture foundation (2026-06-10)
- `Feature.ABDM_INTEGRATION` added to [tier.ts](../../packages/types/src/billing/tier.ts) `Feature` enum + `FEATURE_TIER_MAP` (`Tier.ESSENTIAL`) + `PLANNED_FEATURES`; `FEATURE_DISPLAY` (PLANNED/coming-soon) and `FEATURE_ICONS` entries.
- `abhaAddressSchema` + `abhaNumberSchema` validators in [packages/types/src/clinical/abdm.ts](../../packages/types/src/clinical/abdm.ts) (unit-tested), exported from the clinical barrel.
- `abhaAddress` threaded end-to-end: patient contracts (create/update/response/domain/persistence), API `Patient` entity + mapper + repository select, and the Add/Edit patient form UI (ungated optional demographic field, like insurance).

### Delivered — M1 verification layer, flag-gated (2026-06-11)
- Additive `Patient.abhaNumber` / `abhaKycName` / `abhaVerifiedAt` (migration `20260611010000_add_abha_verification_fields`).
- `verifyAbhaRequestSchema` + `abhaVerificationResultSchema` contracts.
- `IAbdmGateway` port + `AbdmHttpGateway` adapter (timeout-guarded), **gated on `ABDM_BASE_URL`/`ABDM_CLIENT_ID`/`ABDM_CLIENT_SECRET`** — returns `ABDM_NOT_CONFIGURED` until set, so the endpoint is dormant (503) rather than broken.
- `AbhaVerificationService` (persists + audits `ABHA_VERIFIED` on success only) + `POST /patients/:id/abha/verify`, gated by `Feature.ABDM_INTEGRATION` + patient-write roles. Unit-tested (configured/not-configured/unverified/not-found).
- **Go-live = set the three env vars** + confirm the exact ABDM endpoint path/payload in `AbdmHttpGateway.verifyAbha` against the sandbox spec. No code rewrite needed.

### Phase M1 (remaining) — registration UX + HFR/HPR
- UI: a **Verify** action next to the existing ABHA field calling the endpoint above; clinic HFR/HPR ids in Settings (`apps/app/features/settings`).
- Confirm the real ABDM verify endpoint contract against the sandbox (the adapter parses defensively but the path `/v1/abha/verify` and field names are placeholders).
- Future: `CareContext` / consent-artefact models for M2 linking; encrypt ABDM session keys via the existing `EncryptionService`.

### Phase M2 — link records, FHIR R4 (~6–10 weeks)
- FHIR R4 bundle mappers (OPConsultRecord, Prescription, DiagnosticReport) from the existing `prescriptions` / `consultation` / `clinical` domains. There is already an `fhir.ts` stub in `packages/types/src/shared/` — extend it.
- Care-context creation on visit completion; consent-manager callback webhook (HIP flows).

### Phase M3 — HIU, fetch outside records (~3–4 weeks after M2)
- Reuses M2 plumbing; render fetched bundles in the patient timeline (`apps/app/features/patients/components/timeline/`).

---

## 2. DPDP Act 2023 + DPDP Rules 2025 (HIGH — deadline-driven)

**Deadlines:** Data Protection Board live (Nov 2025) · consent-manager provisions **13 Nov 2026** · bulk obligations (notice, breach reporting, retention/erasure, security safeguards, data-principal rights) **13 May 2027**. Penalties up to ₹250 Cr; a healthcare SaaS plausibly qualifies as a Significant Data Fiduciary (annual DPIA, DPO, audits).

**Already in place (updated 2026-06-10 after round-2 audit):** DPDP consent capture (onboarding compliance + public booking) **with notice versioning** (`Consent.templateVersion`); AES-256-GCM on 13 PHI fields (CI-enforced parity); [data-retention.scheduler.ts](../../apps/api/src/shared/modules/compliance/data-retention.scheduler.ts); audit logging + export; **72 h breach runbook** (`docs/operations/BREACH_NOTIFICATION_RUNBOOK.md`); **staff erasure + export endpoints** (`/consent/patients/:id/delete|export`, anonymize-not-delete reconciles the 3-year NMC record floor); **DSR queue** (`DataSubjectRequest` + clinic service, +30-day default SLA, staff UI with overdue badges); **portal self-service requests** (`POST /portal/profile/delete-request|export-request` → DSR rows, channel `PORTAL`).

**Remaining gap items:**
1. **Overdue-DSR alerting** beyond the UI badge (email/WhatsApp digest — channel is a product decision).
2. **DPIA + DPO designation** — organizational, not code.
3. **Consent Manager integration** — only if/when a registered Consent Manager is onboarded (provisions effective 13 Nov 2026).

---

## 3. i18n execution (MEDIUM)

[I18N_PLAN.md](./I18N_PLAN.md) already chose `next-intl` and phased the rollout; zero code exists. Execute Phases 1–2 (scaffold + chrome: sidebar/nav/route-meta labels, login, onboarding), then the Hindi seed. Highest-impact persona: tier-2/3 receptionists.

---

## 4. Telemedicine module (MEDIUM)

NMC Telemedicine Practice Guidelines (2020) remain the framework. Design constraints they impose:
- Video recommended for first consults; consult mode + consent must be logged (a `TELEHEALTH` consent type already exists in `packages/types/src/clinical/medical.ts`).
- **Schedule X / narcotics block-list — ✅ shipped and live.** `validateControlledSubstances` runs on every prescription create; the modality is resolved from `Appointment.type` (`IN_PERSON` | `TELEHEALTH`), so TELEHEALTH appointments already reject controlled substances with `CONTROLLED_SUBSTANCE_TELEMEDICINE_BLOCKED`, and in-person prescriptions log a record-keeping warning.
- E-prescription sharing via the existing WhatsApp delivery path is compliant.
- ≥3-year record retention — already satisfied.

Build as an extension of the `consultation` domain behind `Feature.TELEMEDICINE` — not a new app. Video transport decision (Twilio/100ms/Daily) is its own spike.

---

## 5. Explicit non-goals

- **GST e-invoicing (IRP/IRN):** healthcare services are exempt; threshold for taxable B2B doesn't apply to the clinic segment. Revisit only if pharmacy goods sales ship.
- **Stripe / non-Razorpay processors**, multi-region deploys, dedicated-tenant infra — covered by [feature-to-add-their-warm-valley.md](./feature-to-add-their-warm-valley.md) Phase D.

## 6. Remaining quality backlog (from the audit)

1. ~~12 features on the zero-test allowlist~~ — **done 2026-06-10**: allowlist is empty; every feature has at least one colocated test. Next ratchet: upgrade the smoke tests to functional coverage feature-by-feature.
2. Outbox `LISTEN/NOTIFY` — only if production `pg_stat_statements` shows the 5 s poll mattering.
3. Major upgrades, each isolated: NestJS 12 (tracker exists), Zod 4, TypeScript 6, jscpd 5.
