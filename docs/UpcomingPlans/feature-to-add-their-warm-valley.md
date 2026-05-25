# Clinic-Branded WhatsApp + Full Enterprise Tier — Implementation Plan

## Context

Two features, planned together because they share the same data and tenant model:

1. **Per-clinic WhatsApp identity.** Today every clinic shares one Meta phone number ID and one access token, both sourced from env (`META_PHONE_NUMBER_ID`, `META_ACCESS_TOKEN`) in [apps/api/src/shared/modules/config/app-config.ts:44-48](apps/api/src/shared/modules/config/app-config.ts), exposed via `AppConfigService.getMetaConfig()` in [apps/api/src/shared/modules/config/app-configuration.service.ts](apps/api/src/shared/modules/config/app-configuration.service.ts), and consumed by both [apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts](apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts) and [apps/api/src/shared/modules/messaging/whatsapp/whatsapp-client.service.ts](apps/api/src/shared/modules/messaging/whatsapp/whatsapp-client.service.ts). The clinic's name is already in template variables, but the WhatsApp **sender profile** (number + verified name shown in patient's chat) is Docita's. Clinics want their hospital name in chat. Hospitals should choose between three onboarding paths.

2. **Full Enterprise tier.** A hospital wants the works: hospital-branded UI, their own WhatsApp number, their own Postgres, their own infrastructure, with a base price + per-unit overages that Docita staff can edit in the internal portal. Most of the billing scaffolding already exists; the dedicated-infra side is the heavy lift and is staged as a later phase.

**Constraints**
- DB schema is locked (memory note 2026-03-22): **migrations must be additive only** — no drops, no renames, no destructive changes.
- We must use the existing tier system, not invent new tier names. The relevant tiers are summarised below.

### Tier reality check (do not invent names)

The codebase has **two** tier concepts that map to each other. Use the right one in the right place.

| Layer | Where defined | Values |
|---|---|---|
| DB enum `ClinicTier` | [packages/db/prisma/schema/core-domain-enums.prisma:206-212](packages/db/prisma/schema/core-domain-enums.prisma) | `CAPTURE`, `CORE`, `PLUS`, `PRO`, `ENTERPRISE` |
| Runtime `Tier` enum | [packages/types/src/billing/tier.ts](packages/types/src/billing/tier.ts) | `STARTER`, `ESSENTIAL`, `FRONT_DESK`, `PROFESSIONAL`, `HOSPITAL`, `ENTERPRISE`, `INTELLIGENCE` |

Mapping is centralized in [packages/types/src/access/clinic-tier-map.ts](packages/types/src/access/clinic-tier-map.ts) and consumed by API feature guards such as [apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts](apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts). All gating below references the **runtime `Tier`** values, because that is what `FEATURE_TIER_MAP`, `assertClinicHasFeatureOrThrow`, and `TierGuard` operate on.

`Feature.WHATSAPP_MESSAGING` is currently gated at `Tier.ESSENTIAL` in `FEATURE_TIER_MAP` ([tier.ts](packages/types/src/billing/tier.ts)).

---

## Feature 1 — Per-clinic WhatsApp identity (3 modes, one model)

### 1.1 Three sender modes, gated by tier

| Mode | DB value | New `Feature` flag | Min `Tier` in `FEATURE_TIER_MAP` | What the clinic does |
|---|---|---|---|---|
| **A. Shared + clinic name in body** | `SHARED` | — (uses existing `Feature.WHATSAPP_MESSAGING`) | `ESSENTIAL` (no change) | Nothing. Default. We just make sure every outgoing message body opens with "From {clinicName}" and every Meta template has `clinicName` in the header. |
| **B. BYO BSP** | `BYO` | `Feature.WHATSAPP_OWN_NUMBER` | `Tier.PROFESSIONAL` | Clinic supplies their own Meta `phone_number_id` + permanent access token (their own WABA). We store creds encrypted, verify them by calling Meta, and use them for sends. |
| **C. Docita-managed onboarding** | `MANAGED` | `Feature.WHATSAPP_MANAGED_NUMBER` | `Tier.HOSPITAL` | Clinic uses Meta Embedded Signup against Docita's Tech Provider account. We provision the phone number on their behalf and store the resulting `phone_number_id`. |
| Dedicated full-tenant install | (implicit in Phase D below) | `Feature.DEDICATED_DEPLOYMENT` | `Tier.ENTERPRISE` | Sales-led; covered in Feature 2 Phase D. |

Rationale for tier choice: `WHATSAPP_MESSAGING` is already ESSENTIAL, so the **template-body fix is shipped to everyone who can WhatsApp today** — matches the user's "all tiers with WhatsApp enabled" requirement. BYO is gated at `PROFESSIONAL` because that's where the marketing copy starts mentioning branding (`TIER_INFO.PROFESSIONAL` tagline: "Built for growing clinics"). Managed onboarding is gated at `HOSPITAL` because `TIER_INFO.HOSPITAL.description` already promises "pooled WhatsApp" and dedicated CSM — managed onboarding fits that promise.

### 1.2 DB additions (additive only)

**[packages/db/prisma/schema/core-domain-enums.prisma](packages/db/prisma/schema/core-domain-enums.prisma)** — add enums:

```prisma
enum WhatsappSenderMode {
  SHARED   // default for all clinics
  BYO      // clinic-supplied Meta credentials
  MANAGED  // Docita-provisioned under our TP account
}

enum WhatsappSenderStatus {
  NOT_CONFIGURED
  PENDING_VERIFICATION
  VERIFIED
  FAILED
  REVOKED
}
```

**[packages/db/prisma/schema/clinic-management-models.prisma](packages/db/prisma/schema/clinic-management-models.prisma)** — extend `Clinic` (all nullable / defaulted):

```prisma
whatsappSenderMode      WhatsappSenderMode    @default(SHARED)
whatsappSenderStatus    WhatsappSenderStatus  @default(NOT_CONFIGURED)
whatsappPhoneNumberId   String?               // Meta phone_number_id, set when BYO/MANAGED
whatsappWabaId          String?               // WhatsApp Business Account ID
whatsappDisplayName     String?               // verified_name from Meta (shown in patient's chat)
whatsappVerifiedAt      DateTime?
whatsappLastVerifyError String?
clinicSecrets           ClinicSecret[]
```

**New model in [packages/db/prisma/schema/clinic-management-models.prisma](packages/db/prisma/schema/clinic-management-models.prisma)** — encrypted credentials live in their own table so we never put plaintext tokens in a `Clinic` JSON dump and so the existing `EncryptionService.encrypt()` ([apps/api/src/common/encryption.service.ts](apps/api/src/common/encryption.service.ts)) can be reused directly:

```prisma
model ClinicSecret {
  id          String   @id @default(cuid())
  clinicId    String
  kind        String   // "WHATSAPP_ACCESS_TOKEN" | future kinds
  ciphertext  String   // "<version>:<iv>:<authTag>:<ct>" — exact format produced by EncryptionService
  createdAt   DateTime @default(now())
  rotatedAt   DateTime?

  clinic Clinic @relation(fields: [clinicId], references: [id], onDelete: Cascade)

  @@unique([clinicId, kind])
  @@index([clinicId])
}
```

**[packages/db/prisma/schema/communication-session-models.prisma](packages/db/prisma/schema/communication-session-models.prisma)** — extend `WhatsappLog` so we can audit which sender identity was used:

```prisma
senderPhoneNumberId String?              // null = used shared/global
senderMode          WhatsappSenderMode @default(SHARED)
```

### 1.3 Feature flags + access matrix

**[packages/types/src/billing/tier.ts](packages/types/src/billing/tier.ts)**:

```typescript
// add to Feature enum
WHATSAPP_OWN_NUMBER = "WHATSAPP_OWN_NUMBER",
WHATSAPP_MANAGED_NUMBER = "WHATSAPP_MANAGED_NUMBER",
DEDICATED_DEPLOYMENT = "DEDICATED_DEPLOYMENT",

// add to FEATURE_TIER_MAP
[Feature.WHATSAPP_OWN_NUMBER]: Tier.PROFESSIONAL,
[Feature.WHATSAPP_MANAGED_NUMBER]: Tier.HOSPITAL,
[Feature.DEDICATED_DEPLOYMENT]: Tier.ENTERPRISE,
```

**[packages/types/src/access/access-matrix.ts](packages/types/src/access/access-matrix.ts)** — add target rows. The new endpoints sit alongside the existing `PAGE_WHATSAPP` / `API_WHATSAPP` rows (lines 305–373):

```typescript
PAGE_WHATSAPP_SENDER: {
  read: { roles: ["ADMIN", "ADMIN_DOCTOR"] },
  feature: Feature.WHATSAPP_MESSAGING, // page is visible to anyone who has WA; individual modes gated per-action
},
API_WHATSAPP_SENDER: {
  read:  { roles: ["ADMIN", "ADMIN_DOCTOR"] },
  write: { roles: ["ADMIN", "ADMIN_DOCTOR"] },
  feature: Feature.WHATSAPP_MESSAGING,
},
```

Per-mode feature checks happen at the **use-case** layer, not the route, so we can return a helpful "upgrade to Professional/Hospital" error rather than a 403 from `TierGuard`.

### 1.4 Backend changes

**Resolver service** — new `WhatsappSenderResolver` in `apps/api/src/domains/whatsapp/application/services/whatsapp-sender-resolver.service.ts`:

- Given `clinicId`, returns a `ResolvedSenderConfig { phoneNumberId, accessToken, mode, senderPhoneNumberId }`.
- Reads `clinic.whatsappSenderMode` + `whatsappSenderStatus`.
  - `SHARED` or unverified BYO/MANAGED → returns env-sourced `AppConfigService.getMetaConfig()` values.
  - Verified BYO/MANAGED → loads `ClinicSecret(kind="WHATSAPP_ACCESS_TOKEN")`, decrypts via `EncryptionService.decrypt()`, returns clinic's `phoneNumberId` + decrypted token.
- Emits a structured warning log when a clinic is in BYO/MANAGED but not yet `VERIFIED` and we fall back to SHARED.

**Adapter refactor** — change [whatsapp-api.adapter.ts:23-31](apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts) so `sendMessage()` accepts a `ResolvedSenderConfig` parameter instead of reading from the constructor-cached env values. The adapter stays stateless w.r.t. credentials. The constructor still warns if env defaults are missing (for SHARED fallback).

**Use case wiring** — [send-message.use-case.ts:54-153](apps/api/src/domains/whatsapp/application/use-cases/send-message.use-case.ts):
1. After `assertClinicHasFeatureOrThrow(clinic, Feature.WHATSAPP_MESSAGING)`, call `senderResolver.resolve(clinicId)`.
2. Pass resolved config into adapter.
3. When creating `WhatsappLog`, set `senderPhoneNumberId` and `senderMode`.

**Reminder flow** — [reminder-notification.service.ts:124-201](apps/api/src/domains/reminders/application/services/reminder-notification.service.ts) already calls `SendMessageUseCase.execute`; no change needed since the resolver is upstream of the use case. The `variables.clinicName` already exists and is used in templates; ensure every seeded template (see `apps/api/src/seed/` for `WhatsappTemplate` seeds) includes a header or first-line `{{clinicName}}` so the clinic identity is unmistakable even in SHARED mode.

**New module** — `apps/api/src/domains/whatsapp/sender-config/` mirroring existing whatsapp domain layout:

```
sender-config/
  presentation/controllers/whatsapp-sender.controller.ts
  application/use-cases/
    update-sender-mode.use-case.ts        // sets mode; for BYO encrypts + stores token
    verify-sender.use-case.ts             // GET https://graph.facebook.com/v21.0/{phone_number_id} with stored token, reads verified_name & display_phone_number
    start-managed-onboarding.use-case.ts  // returns Embedded Signup URL (stub until Meta TP approved — return 501 with "contact support" payload)
    revoke-sender.use-case.ts             // wipes ClinicSecret, resets mode to SHARED
```

Endpoints (mounted under `whatsapp/sender` on the same controller pattern as [whatsapp.controller.ts:29-33](apps/api/src/domains/whatsapp/presentation/controllers/whatsapp.controller.ts) — same guards, same `@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP_SENDER))` decorator):

- `GET /whatsapp/sender` → returns `{ mode, status, phoneNumberId, displayName, verifiedAt, lastError, allowedModes }` where `allowedModes` is computed from the clinic's tier (so the UI knows what to enable).
- `PUT /whatsapp/sender` body `{ mode, phoneNumberId?, accessToken?, wabaId? }` — validates tier per mode, encrypts token, persists, sets status `PENDING_VERIFICATION`.
- `POST /whatsapp/sender/verify` — performs the live Meta call, updates `whatsappDisplayName`, `whatsappVerifiedAt`, status `VERIFIED` or `FAILED` (+ `lastVerifyError`).
- `POST /whatsapp/sender/managed-onboarding/start` — returns 501 until Meta TP approved; the endpoint exists so the UI can be built end-to-end.
- `DELETE /whatsapp/sender` — revoke (deletes `ClinicSecret`, resets to SHARED).

**Webhook** — the existing `SupportWhatsAppInboxService.recordIncomingMessages()` (called from [whatsapp-webhook.controller.ts](apps/api/src/domains/whatsapp/presentation/controllers/whatsapp-webhook.controller.ts)) already extracts `value.metadata.phone_number_id` and resolves a clinic. Add the new resolution rule: look up `Clinic` by `whatsappPhoneNumberId` first, fall back to the global match (Docita's number) otherwise. This is the key change that lets inbound replies route to the right clinic when they have BYO/MANAGED numbers.

### 1.5 Frontend changes

New settings surface, slotted into the existing settings layout used by [apps/app/features/settings/components/notifications/NotificationSettings.tsx:48-103](apps/app/features/settings/components/notifications/NotificationSettings.tsx):

- New component `apps/app/features/settings/components/whatsapp/WhatsappSenderSettings.tsx` with three radio cards (SHARED / BYO / MANAGED). Each card is disabled with an "Upgrade to {tier}" CTA when the clinic's tier doesn't reach the gate; the upgrade button routes to the existing [apps/app/app/(protected)/upgrade/page.tsx](apps/app/app/(protected)/upgrade/page.tsx).
- Verification status badge driven by `whatsappSenderStatus`.
- BYO card: form for `phoneNumberId`, `wabaId`, `accessToken` (write-only field) with a "Verify" button.
- MANAGED card: "Start onboarding" button → opens Embedded Signup popup (stub until TP approved).
- New page route `apps/app/app/(protected)/settings/whatsapp-sender/page.tsx` rendering the component.
- Extend [apps/app/hooks/api/use-whatsapp.ts](apps/app/hooks/api/use-whatsapp.ts) with `useWhatsappSender()`, `useUpdateWhatsappSender()`, `useVerifyWhatsappSender()`, `useRevokeWhatsappSender()`.

### 1.6 Verification

- **Unit**: `WhatsappSenderResolver` — SHARED returns env, verified BYO returns decrypted token, unverified BYO falls back to SHARED with a warn log.
- **Integration**: `PUT /whatsapp/sender` followed by `POST /verify` using Meta test credentials; assert `WhatsappLog.senderPhoneNumberId` matches the clinic's number on the next reminder send.
- **Backwards compat**: a clinic with `whatsappSenderMode = SHARED` (the default after migration) must send identically to today — no behavior change for the vast majority of clinics on day 1.
- **Webhook**: simulate inbound from the clinic's BYO number; assert the message lands on the clinic's `SupportWhatsAppInbox`, not Docita's default.
- **Manual**: send an ESSENTIAL-tier appointment reminder; confirm body starts with "From {clinicName}" even though the WhatsApp profile shows Docita.

---

## Feature 2 — Full Enterprise Tier (phased)

The codebase already has a solid foundation: `EnterpriseContract` model exists in [packages/db/prisma/schema.prisma:2864-2906](packages/db/prisma/schema.prisma), the internal portal has a dedicated page at [apps/internal/app/(protected)/enterprise-contracts/page.tsx](apps/internal/app/(protected)/enterprise-contracts/page.tsx), the API has both a clinic-facing controller [clinic-enterprise-contract.controller.ts](apps/api/src/domains/enterprise-contracts/presentation/controllers/clinic-enterprise-contract.controller.ts) and an internal controller [internal-enterprise-contracts.controller.ts](apps/api/src/domains/enterprise-contracts/presentation/controllers/internal-enterprise-contracts.controller.ts), and a true-up scheduler [enterprise-contract-trueup.scheduler.ts](apps/api/src/domains/enterprise-contracts/infrastructure/schedulers/enterprise-contract-trueup.scheduler.ts).

Gaps to close:

1. **Missing overage dimensions.** `EnterpriseContract` covers users, consultations, WhatsApp messages, storage, branches. It does **not** cover doctors, prescriptions, or invoices. The user explicitly asked for those.
2. **No general "custom line items" mechanism** for billable enterprise features that don't fit a pre-defined column.
3. **Branding is not consumed.** `Clinic.branding Json?` exists but the UI/email/whatsapp layers still render Docita strings.
4. **Per-clinic infra credentials** (own Razorpay, own DB, own WhatsApp) are not in scope of the existing model.
5. **No dedicated-deployment infrastructure-as-code.** Single Fly.io app, single RDS today.

### Phase A — Custom enterprise pricing dimensions (ship first)

**DB additions** to `EnterpriseContract` in [packages/db/prisma/schema.prisma:2864-2906](packages/db/prisma/schema.prisma) (all additive, all defaulted so existing rows are unaffected):

```prisma
includedDoctors           Int  @default(0)
includedPrescriptions     Int  @default(0)
includedInvoices          Int  @default(0)

overageDoctorCents        Int  @default(0)
overagePrescriptionCents  Int  @default(0)
overageInvoiceCents       Int  @default(0)

customLineItems           Json @default("[]")
// Shape: [{ key: string, label: string, includedQty: int, unitCents: int, usageType?: UsageType, source?: "USAGE_RECORD" | "MANUAL" }]
// Lets Docita staff bill arbitrary "other billable enterprise features" without code changes.

setupFeeCents             Int  @default(0)
dedicatedSupportCents     Int  @default(0)  // monthly retainer if applicable
```

**UsageType additions** in [packages/db/prisma/schema/billing-enums.prisma:33-40](packages/db/prisma/schema/billing-enums.prisma):

```prisma
enum UsageType {
  ACTIVE_PATIENTS
  APPOINTMENTS
  STORAGE_GB
  USERS
  WHATSAPP_MESSAGES
  AI_CREDITS
  // additive:
  DOCTORS
  PRESCRIPTIONS
  INVOICES
  CONSULTATIONS   // distinct from APPOINTMENTS — only completed appointments count
}
```

**Usage emission.** [apps/api/src/domains/billing/core/services/usage-tracking.service.ts](apps/api/src/domains/billing/core/services/usage-tracking.service.ts) already has the `recordUsageEvent` primitive with dedup-by-`eventKey`. Existing emitters cover `APPOINTMENTS` (`trackAppointment`) and `WHATSAPP_MESSAGES` (via `@OnEvent('whatsapp.message.sent')`). Add three new `@OnEvent` listeners on the same service:

- `prescription.created` → `UsageType.PRESCRIPTIONS` keyed on `prescriptionId`.
- `invoice.created` → `UsageType.INVOICES` keyed on `invoiceId`.
- `appointment.completed` → `UsageType.CONSULTATIONS` keyed on `appointmentId` (separate eventKey so it doesn't collide with the APPOINTMENTS event).

`DOCTORS` is **not** event-driven — instead, derive monthly active doctor count via a nightly job that counts `DoctorClinic` rows with `removedAt = NULL` for each clinic in the period. Add this to the existing enterprise true-up scheduler [enterprise-contract-trueup.scheduler.ts](apps/api/src/domains/enterprise-contracts/infrastructure/schedulers/enterprise-contract-trueup.scheduler.ts).

The pricing engine that computes invoices from `EnterpriseContract` + aggregated `UsageRecord` rows must be extended to read the new included/overage columns and to iterate `customLineItems`. Whatever file already drives `EnterpriseContractInvoice` creation (in `apps/api/src/domains/enterprise-contracts/application/`) gets the new dimensions added in one place — keep one pricing function, don't duplicate.

**Internal portal** — extend [apps/internal/app/(protected)/enterprise-contracts/page.tsx](apps/internal/app/(protected)/enterprise-contracts/page.tsx):

- New form fields for the three new included/overage pairs and the two flat fees.
- A `CustomLineItemsEditor` component (add row / remove row / drag-reorder; fields key, label, includedQty, unitCents, optional usageType).
- A "Preview invoice" panel that calls a new endpoint `POST /internal/enterprise-contracts/:contractId/invoice-preview` (add to [internal-enterprise-contracts.controller.ts](apps/api/src/domains/enterprise-contracts/presentation/controllers/internal-enterprise-contracts.controller.ts)) which runs the pricing engine in dry-run mode against the contract's last full month of `UsageRecord` rows and returns the line-item breakdown.

**Clinic-side visibility** — extend [clinic-enterprise-contract.controller.ts](apps/api/src/domains/enterprise-contracts/presentation/controllers/clinic-enterprise-contract.controller.ts) so the clinic admin can see (read-only) their own contract terms, current-period usage vs included quantities, and projected overage. Mount under the existing subscription settings area in [apps/app/app/(protected)/settings](apps/app/app/(protected)/settings).

### Phase B — Branding/whitelabel consumption (ship after A)

Today `Clinic.branding Json?` exists but is unused. Define a typed schema in [packages/types/src/shared/clinics.ts](packages/types/src/shared/clinics.ts):

```typescript
export const brandingConfigSchema = z.object({
  displayName: z.string().optional(),       // hospital name; defaults to clinic.name
  logoUrl: z.string().url().optional(),     // already partially supported via clinic.logo
  primaryColor: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  legalEntityName: z.string().optional(),
  customDomain: z.string().optional(),      // ENTERPRISE only — enforced server-side
});
```

Render replacements (each currently has a hardcoded `"Docita"`):

- [apps/api/src/shared/modules/messaging/email/email.service.ts](apps/api/src/shared/modules/messaging/email/email.service.ts) — replace hardcoded `supportEmail`, signatures, subject prefixes with `branding.displayName ?? clinic.name` / `branding.supportEmail ?? PLATFORM_SUPPORT_EMAIL`.
- WhatsApp template renderer (where `clinicName` variable is filled — invoked from [reminder-notification.service.ts:140-156](apps/api/src/domains/reminders/application/services/reminder-notification.service.ts)) — prefer `branding.displayName`.
- [apps/app/app/layout.tsx](apps/app/app/layout.tsx) — title/metadata becomes branding-aware via a server-side resolver (host header → clinic → branding).

Gate `customDomain` and `legalEntityName` writes behind `Feature.CUSTOM_BRANDING` (already in `FEATURE_TIER_MAP` at `Tier.PROFESSIONAL`, [tier.ts](packages/types/src/billing/tier.ts)) and `Feature.DEDICATED_DEPLOYMENT` (new, ENTERPRISE) respectively.

**Internal portal**: a new "Branding" tab on the enterprise-contracts detail page lets Docita staff edit the JSON; clinics on PROFESSIONAL+ get a self-service version under settings (already implied by `Feature.CUSTOM_BRANDING` existing — just wire UI to it).

### Phase C — Per-clinic infra credentials (ship after B)

Reuse the `ClinicSecret` table introduced in Feature 1.

- New `kind` values: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `R2_BUCKET_CREDENTIALS`, etc.
- A gateway resolver in front of [razorpay-subscription.gateway.ts](apps/api/src/gateways/razorpay-subscription.gateway.ts) picks per-clinic creds when present (ENTERPRISE), platform creds otherwise. Patient-facing invoices settle to the clinic's Razorpay merchant; the Docita platform fee continues to be billed through `EnterpriseContractInvoice`.

### Phase D — Dedicated deployment (roadmap, not ship-now)

Reality: there is **zero infrastructure-as-code** today. Single Fly.io app `docita-api`, single Cloudflare Workers deployment for `apps/app`, single AWS RDS, single R2 bucket. The path from "shared SaaS" to "per-hospital dedicated install" is multi-quarter work.

Order of operations once we commit:

1. **Terraform module per customer** — Fly.io app for API + worker, Neon or RDS Postgres, R2 bucket, Cloudflare Workers project for `apps/app`. Inputs: customer slug, region, branding values.
2. **Secret vaulting** — move from env-baked secrets to Doppler / 1Password / Fly secrets indexed by customer slug. The existing [app-config.ts](apps/api/src/shared/modules/config/app-config.ts) becomes the consumer.
3. **Custom domain** — CNAME per hospital onto Cloudflare Workers route; certificate management automated.
4. **CI/CD matrix** — extend [.github/workflows](.github/workflows) so each enterprise customer is a deploy target; build artifacts shared, configs per-customer.
5. **Migration tool** — a script that exports a clinic's data from shared DB into a dedicated DB and flips DNS. Must handle all clinic-scoped tables (all of `clinicId`-keyed models in the schema).
6. **Runbook** — extend [docs/operations/DEPLOYMENT.md](docs/operations/DEPLOYMENT.md) with the per-customer lifecycle: onboard, upgrade, decommission.

Phase D is intentionally not detailed further here; it should be its own plan when the first enterprise customer is signed.

### 2.x Verification

**Phase A**:
- Seed an `EnterpriseContract` with non-zero `includedDoctors / Prescriptions / Invoices` and per-unit overages, plus one `customLineItems` row.
- Generate test prescriptions, invoices, completed appointments; verify `UsageEvent` and (after running the nightly job) `UsageRecord` rows exist for each new `UsageType`.
- Hit `POST /internal/enterprise-contracts/:contractId/invoice-preview` → invoice breakdown lines match a hand-computed expectation including the custom line item.
- Existing contracts (with no new fields set) continue to invoice identically — guarded by `@default(0)` on every new column.

**Phase B**: set branding on a test ENTERPRISE clinic, send a welcome email and a WhatsApp reminder, assert the hospital's name and support email appear, not Docita's.

**Phase C**: configure a sandbox Razorpay merchant on a test clinic; a patient invoice settles to that merchant; the contract platform fee continues to settle to Docita's merchant.

**Phase D**: out of scope of this plan.

---

## Critical files to modify

WhatsApp (Feature 1):
- [packages/db/prisma/schema/core-domain-enums.prisma](packages/db/prisma/schema/core-domain-enums.prisma) — `WhatsappSenderMode`, `WhatsappSenderStatus`
- [packages/db/prisma/schema/clinic-management-models.prisma](packages/db/prisma/schema/clinic-management-models.prisma) — Clinic fields + new `ClinicSecret` model
- [packages/db/prisma/schema/communication-session-models.prisma](packages/db/prisma/schema/communication-session-models.prisma) — `WhatsappLog.senderPhoneNumberId`, `senderMode`
- [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma) — regenerated consolidated schema (mirrors the modular changes above)
- [packages/types/src/billing/tier.ts](packages/types/src/billing/tier.ts) — three new `Feature` flags + `FEATURE_TIER_MAP` entries
- [packages/types/src/access/access-matrix.ts](packages/types/src/access/access-matrix.ts) — new access targets
- [apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts](apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts) — accept resolved sender config
- [apps/api/src/domains/whatsapp/application/use-cases/send-message.use-case.ts](apps/api/src/domains/whatsapp/application/use-cases/send-message.use-case.ts) — call resolver, write log fields
- [apps/api/src/domains/whatsapp/presentation/controllers/whatsapp-webhook.controller.ts](apps/api/src/domains/whatsapp/presentation/controllers/whatsapp-webhook.controller.ts) — route inbound by `phone_number_id`
- New: `apps/api/src/domains/whatsapp/sender-config/**`
- [apps/app/features/settings/components/whatsapp/WhatsappSenderSettings.tsx](apps/app/features/settings/components/whatsapp/WhatsappSenderSettings.tsx) (new)
- [apps/app/app/(protected)/settings/whatsapp-sender/page.tsx](apps/app/app/(protected)/settings/whatsapp-sender/page.tsx) (new)
- [apps/app/hooks/api/use-whatsapp.ts](apps/app/hooks/api/use-whatsapp.ts) — new hooks
- WhatsApp template seeds in `apps/api/src/seed/` — ensure `{{clinicName}}` is present in template headers

Enterprise (Feature 2):
- [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma) — `EnterpriseContract` field additions
- [packages/db/prisma/schema/billing-enums.prisma](packages/db/prisma/schema/billing-enums.prisma) — new `UsageType` values
- [apps/api/src/domains/billing/core/services/usage-tracking.service.ts](apps/api/src/domains/billing/core/services/usage-tracking.service.ts) — new emitters
- [apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts.service.ts](apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts.service.ts) — pricing engine for new dimensions
- [apps/api/src/domains/enterprise-contracts/presentation/controllers/internal-enterprise-contracts.controller.ts](apps/api/src/domains/enterprise-contracts/presentation/controllers/internal-enterprise-contracts.controller.ts) — invoice preview endpoint
- [apps/api/src/domains/enterprise-contracts/infrastructure/schedulers/enterprise-contract-trueup.scheduler.ts](apps/api/src/domains/enterprise-contracts/infrastructure/schedulers/enterprise-contract-trueup.scheduler.ts) — monthly doctor count aggregation
- [apps/internal/app/(protected)/enterprise-contracts/page.tsx](apps/internal/app/(protected)/enterprise-contracts/page.tsx) — new fields, custom-line-items editor, invoice preview
- [apps/internal/lib/api.ts](apps/internal/lib/api.ts) — `enterpriseContractsAPI` typings + preview endpoint
- (Phase B) [apps/api/src/shared/modules/messaging/email/email.service.ts](apps/api/src/shared/modules/messaging/email/email.service.ts) — branding-aware
- (Phase B) [packages/types/src/shared/clinics.ts](packages/types/src/shared/clinics.ts) — `brandingConfigSchema`

## Reusable utilities (do not reinvent)

- `EncryptionService.encrypt/decrypt` at [apps/api/src/common/encryption.service.ts](apps/api/src/common/encryption.service.ts) — AES-GCM, key-versioned. Use as-is for `ClinicSecret`.
- `assertClinicHasFeatureOrThrow` + `TierGuard` + `@RequireFeature` — already wired throughout the WhatsApp domain ([whatsapp.controller.ts:29-33](apps/api/src/domains/whatsapp/presentation/controllers/whatsapp.controller.ts)). Reuse on the new sender controller verbatim.
- `UsageTrackingService.recordUsageEvent` — keyed by `eventKey` for dedup. Add listeners; don't fork the service.
- Tier display strings in `TIER_INFO` ([tier.ts](packages/types/src/billing/tier.ts)) — use them for the upgrade-CTA copy in the WhatsApp sender UI.
- `mapDbClinicTierStringToTierName` — when converting `clinic.tier` (DB) to runtime tier comparisons.
- Existing `WhatsappTemplate` model and seeds — extend, don't duplicate.

## Refinements (cross-cutting concerns)

These apply across both features and tighten the plan.

### R1. Reachability of `Tier.HOSPITAL` — DB enum needs an additive bump

DB enum `ClinicTier` ([packages/db/prisma/schema/core-domain-enums.prisma:206-212](packages/db/prisma/schema/core-domain-enums.prisma)) is `CAPTURE | CORE | PLUS | PRO | ENTERPRISE`. The mapping in [packages/types/src/access/clinic-tier-map.ts](packages/types/src/access/clinic-tier-map.ts) takes `PRO → PROFESSIONAL` and `ENTERPRISE → ENTERPRISE`. **No stored DB value maps to `Tier.HOSPITAL` today**, which means anything I gate at `HOSPITAL` is effectively ENTERPRISE-only until we expand the DB enum.

Resolution (additive, allowed by the locked-schema rule): add `HOSPITAL` to `ClinicTier` and add `HOSPITAL: "HOSPITAL"` to `LEGACY_CLINIC_TIER_TO_TIER_NAME` (the `tierSchema.safeParse` already handles canonical names, so this works once Prisma accepts the new value). Without this, `WHATSAPP_MANAGED_NUMBER` is in practice an ENTERPRISE feature, which is acceptable as a fallback — but call this out as a deliberate choice, not an accident. **Decision point for the user at implementation time:** add `HOSPITAL` to the enum, or downgrade `WHATSAPP_MANAGED_NUMBER` gating to `PROFESSIONAL`. The plan codes for the former.

### R2. Rollout sequencing & feature flags

The new endpoints stay dark until ready. Add a single env-gated flag in [app-config.ts](apps/api/src/shared/modules/config/app-config.ts):

```typescript
WHATSAPP_PER_CLINIC_SENDER_ENABLED: z.coerce.boolean().default(false),
ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED: z.coerce.boolean().default(false),
```

The `whatsapp/sender` controller returns 503 when the flag is off; the new enterprise contract fields are persisted regardless but the pricing engine only consumes them when the flag is on (so internal staff can prep data without affecting billing). Flip flags per environment: staging → first beta clinic → general availability.

Ship order, smallest unit per PR:

1. Schema migrations (additive — Clinic fields, `ClinicSecret`, `WhatsappLog` columns, enum additions, EnterpriseContract column additions, new UsageType values).
2. Backend resolver + adapter refactor for SHARED-mode-only (no behavior change — all clinics stay on env-sourced creds via the resolver). Land this and validate metrics before exposing UI.
3. New WhatsApp sender endpoints (behind `WHATSAPP_PER_CLINIC_SENDER_ENABLED=false`).
4. Frontend UI (still hidden by 503 from backend).
5. Flip flag in staging, run E2E against a Docita-owned Meta test number.
6. Enterprise pricing engine extensions + portal UI under the second flag.
7. Beta with one enterprise customer; flip GA.

### R3. Backfill + safety on migration day

Once the migration runs:

- All existing `Clinic` rows get `whatsappSenderMode = SHARED`, `whatsappSenderStatus = NOT_CONFIGURED` (defaults). Behavior is identical to today.
- All existing `WhatsappLog` rows get `senderMode = SHARED`, `senderPhoneNumberId = NULL`. Reporting that asks "who sent this" treats NULL/SHARED as "Docita default."
- All existing `EnterpriseContract` rows get `0` on every new included/overage column and `[]` on `customLineItems` — they invoice identically.
- The next `EnterpriseContractInvoice` after the migration must be **manually validated** for the first 1–2 enterprise customers before flipping the engine flag on.

### R4. AuditLog every sensitive change

The codebase has an `AuditLog` table ([packages/db/prisma/schema/monitoring-import-models.prisma](packages/db/prisma/schema/monitoring-import-models.prisma)) already used elsewhere. Emit audit rows for:

- `WHATSAPP_SENDER_MODE_CHANGED` (clinic admin)
- `WHATSAPP_SENDER_VERIFIED` / `WHATSAPP_SENDER_VERIFY_FAILED`
- `WHATSAPP_SENDER_REVOKED`
- `CLINIC_SECRET_WRITTEN` / `CLINIC_SECRET_DELETED` (kind only, never plaintext)
- `ENTERPRISE_CONTRACT_UPDATED` (with diff in `metadata`) — and persist an `EnterpriseContractRevision` row (the model already exists at [schema.prisma:2921-2934](packages/db/prisma/schema.prisma)). Every edit through the internal portal must create exactly one revision row.

### R5. Token lifecycle (BYO)

Meta access tokens can be either short-lived (60-day system user tokens) or permanent (system user permanent tokens). We require **permanent** tokens for BYO and reject anything that returns a `data_access_expires_at` within 90 days when we hit `/debug_token`.

- Verify endpoint stores the token's `data_access_expires_at` on `Clinic.whatsappLastVerifyError` (renamed concept — use a separate `whatsappTokenExpiresAt DateTime?` field) and schedules a warning at T-30 days.
- A daily job (extend the existing cron set in [apps/worker](apps/worker) or [enterprise-contract-trueup.scheduler.ts](apps/api/src/domains/enterprise-contracts/infrastructure/schedulers/enterprise-contract-trueup.scheduler.ts) sibling) re-validates each BYO clinic's token weekly; on failure, sets status `FAILED`, emits an audit event, emails the clinic admin (existing email service), and falls back to SHARED for sends (with a one-time notice in the WhatsApp message body explaining the fallback).

So the additional Clinic field becomes:

```prisma
whatsappTokenExpiresAt  DateTime?
```

### R6. Webhook routing — disambiguation

Today inbound is matched by `value.metadata.phone_number_id` against Docita's global config. After this change:

1. Lookup `Clinic` where `whatsappPhoneNumberId = value.metadata.phone_number_id`.
2. If found and `whatsappSenderStatus = VERIFIED` → route to that clinic.
3. Else if `phone_number_id == META_PHONE_NUMBER_ID` (env) → existing SHARED routing.
4. Else log unknown-number and drop (or route to a Docita inbox for investigation).

Add a unique partial index on `Clinic(whatsappPhoneNumberId) where whatsappPhoneNumberId is not null` (Prisma supports `@@unique([whatsappPhoneNumberId])` with nulls allowed in Postgres) — prevents two clinics from claiming the same number.

### R7. Patient opt-in & template approval (MANAGED specifically)

WhatsApp's policy ties opt-ins and templates to a `phone_number_id`. When a clinic switches from SHARED to BYO or MANAGED:

- Existing patient opt-in records (whatever today's `whatsappAutomation` consent fields look like) remain valid for the clinic relationship, but Meta sees a new sender. Operationally this is fine but the first session-window message must be a template, not free text.
- Templates approved on Docita's WABA are **not** available on a clinic's BYO WABA — the clinic must re-submit them. Seed a "starter template pack" CSV in [apps/api/src/seed/](apps/api/src/seed/) so clinics can copy text into Meta Business Manager.
- For MANAGED, Docita's TP account submits templates on behalf of the clinic — that workflow is its own scheduled work, out of scope here but mention as a follow-up.

### R8. EnterpriseContract semantics — precedence over `Subscription`

A clinic can today have a `Subscription` row (Razorpay) and could also be a member of an `EnterpriseContract`. Clarify the precedence rule in the pricing engine (likely already implicit but worth pinning):

- If the clinic is a current `EnterpriseContractMember` (joinedAt ≤ now, removedAt is NULL or future) → enterprise pricing wins; `Subscription` is informational only and should be paused/cancelled when the member joins. The internal portal "add member" action should cancel any active Razorpay subscription for that clinic.
- Otherwise → standard tier pricing via `Subscription` + `TierPricing`.

Add a one-line precedence test in the pricing engine, plus an audit alert when both are simultaneously "active" — that's a state we should never be in.

### R9. Currency, tax, and proration for new dimensions

`EnterpriseContract.currency` already exists. Every `customLineItems` entry inherits the contract's currency — do **not** allow per-item currency. Tax handling reuses the existing `SubscriptionPayment.taxSummary` / `sellerTaxSnapshot` / `buyerTaxSnapshot` JSON columns ([schema.prisma:2974-2993](packages/db/prisma/schema.prisma)); the enterprise invoice generator must populate these snapshots from the same code path the regular subscription invoice uses (refactor opportunity: extract a shared `buildTaxSnapshot()` helper). Mid-period contract edits never retroactively change a closed period's invoice — they take effect on the next period boundary; the existing `EnterpriseContractRevision.effectiveDate` is the source of truth.

### R10. Observability

For both features:

- Structured logs with `clinicId`, `senderMode`, and `event` fields.
- Add metrics (whatever telemetry plumbing the project uses today — search for `Sentry` / `OpenTelemetry` setup in [apps/api/src/main.ts](apps/api/src/main.ts) — to confirm) for: WhatsApp send error rate **per sender mode**, BYO verify success/failure rate, enterprise invoice generation duration, monthly true-up false-positive rate.
- Alert when fallback to SHARED triggers for a BYO/MANAGED clinic (could mean their creds broke silently).

### R11. Data retention on offboarding

When a clinic resets sender mode to SHARED, downgrades below the required tier, or has their contract terminated:

- `ClinicSecret(kind="WHATSAPP_ACCESS_TOKEN")` row is hard-deleted.
- `Clinic.whatsappPhoneNumberId`, `whatsappWabaId`, `whatsappDisplayName` are nulled.
- `WhatsappLog` history retained for audit (no PII beyond what's already there).
- For enterprise offboarding: `EnterpriseContract.status = EXPIRED`, but invoices, revisions, and members remain — they're historical records.

### R12. Test plan (concrete locations)

- Unit tests for `WhatsappSenderResolver` at `apps/api/src/domains/whatsapp/application/services/__tests__/whatsapp-sender-resolver.spec.ts`.
- Unit tests for the new pricing engine paths next to the existing enterprise contract service (`apps/api/src/domains/enterprise-contracts/application/services/__tests__/`).
- E2E tests under `apps/api/test/` covering: send-message with each sender mode; webhook inbound routing; enterprise invoice with `customLineItems`.
- Snapshot test the access matrix to lock the new feature gates against accidental changes (extend [packages/types/test/access.test.ts](packages/types/test/access.test.ts)).
- Add fixture data for an enterprise clinic with non-zero new-dimension included quantities to the seed file so internal staff can demo end-to-end after `pnpm seed`.

### R13. Documentation

- Update [docs/operations/DEPLOYMENT.md](docs/operations/DEPLOYMENT.md) with the two new env vars and rollout instructions.
- Add a new internal runbook `docs/runbooks/whatsapp-per-clinic-sender.md` (this is one of the rare doc files worth writing — operational, not narrative) covering: how to onboard a BYO clinic step-by-step, what to do when a verify fails, how to revoke compromised credentials.
- Add `docs/runbooks/enterprise-contract-editing.md` covering: how staff edit contracts, what triggers a revision, how the invoice preview maps to the next billing run.

### R14. Security review checkpoint

Token storage is a sensitive change. Before flipping the BYO flag in production:

- Run `/security-review` on the diff (the skill is available in this environment).
- Confirm `EncryptionService` key rotation procedure documented; staging rehearsal of a key-version bump.
- Penetration sanity check: ensure no log line, audit log, error response, or Sentry breadcrumb can leak a plaintext token (it's easy to do this by accident with `JSON.stringify(error)` on an axios error that contains the request payload).

### R15. Repo-verified corrections before implementation

The first implementation pass must correct these references and assumptions from the older draft:

- The active Meta config service path is [apps/api/src/shared/modules/config/app-configuration.service.ts](apps/api/src/shared/modules/config/app-configuration.service.ts), not only the env schema in `app-config.ts`. Add new rollout flags to `app-config.ts`, expose them through `AppConfigService`, and consume flags through the service only.
- There are two WhatsApp sending surfaces today:
  - [apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts](apps/api/src/domains/whatsapp/infrastructure/adapters/whatsapp-api.adapter.ts) for the domain WhatsApp use cases.
  - [apps/api/src/shared/modules/messaging/whatsapp/whatsapp-client.service.ts](apps/api/src/shared/modules/messaging/whatsapp/whatsapp-client.service.ts) for shared messaging, staff notifications, and template sends.
- The sender resolver cannot be wired into only one adapter. Create one shared `ResolvedWhatsappSender` contract and use it in both send paths, otherwise some reminder/support/template flows will keep sending from the Docita number even after a clinic verifies its own number.
- `packages/types/src/billing/tier.ts` already has runtime `Tier.HOSPITAL`, but Prisma `ClinicTier` does not. Add the DB enum value additively before gating managed WhatsApp at `Tier.HOSPITAL`; otherwise managed WhatsApp is not reachable for stored clinics.
- `EnterpriseContractRevision` already exists and is written by [enterprise-contracts.service.ts](apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts.service.ts). Do not add a second revision/audit mechanism for contract edits; extend the existing revision snapshots and add `AuditLog` rows only for compliance-sensitive events.
- The internal enterprise page currently has local form state and preset data in [apps/internal/app/(protected)/enterprise-contracts/page.tsx](apps/internal/app/(protected)/enterprise-contracts/page.tsx). Move shared preset/shape validation into `packages/types` as part of the dynamic-pricing change so internal UI and API stay in parity.

### R16. Zod API contract details

All new request/response shapes must be defined in `packages/types` first and reused by API DTOs and frontend/internal clients.

**WhatsApp sender schemas** — add to `packages/types/src/contracts/whatsapp.ts` or a sibling shared file exported from the existing WhatsApp contract barrel:

```typescript
export const whatsappSenderModeSchema = z.enum(["SHARED", "BYO", "MANAGED"]);
export const whatsappSenderStatusSchema = z.enum([
  "NOT_CONFIGURED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "FAILED",
  "REVOKED",
]);

export const whatsappSenderConfigResponseSchema = z.object({
  mode: whatsappSenderModeSchema,
  status: whatsappSenderStatusSchema,
  phoneNumberId: z.string().nullable(),
  wabaId: z.string().nullable(),
  displayName: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  tokenExpiresAt: z.string().nullable(),
  lastVerifyError: z.string().nullable(),
  allowedModes: z.array(whatsappSenderModeSchema),
  fallbackActive: z.boolean(),
});

export const updateWhatsappSenderRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("SHARED") }).strict(),
  z.object({
    mode: z.literal("BYO"),
    phoneNumberId: z.string().min(3).max(80),
    wabaId: z.string().min(3).max(80).optional(),
    accessToken: z.string().min(40).max(4096),
  }).strict(),
  z.object({ mode: z.literal("MANAGED") }).strict(),
]);
```

**Enterprise pricing schemas** — extend [packages/types/src/billing/enterprise-contract.ts](packages/types/src/billing/enterprise-contract.ts):

```typescript
export const enterpriseCustomLineItemSchema = z.object({
  key: z.string().regex(/^[a-z0-9_:-]+$/).max(80),
  label: z.string().min(1).max(120),
  includedQty: z.number().int().nonnegative(),
  unitCents: z.number().int().nonnegative(),
  usageType: z.enum([
    "DOCTORS",
    "CONSULTATIONS",
    "WHATSAPP_MESSAGES",
    "PRESCRIPTIONS",
    "INVOICES",
  ]).optional(),
  source: z.enum(["USAGE_RECORD", "MANUAL"]).default("USAGE_RECORD"),
  enabled: z.boolean().default(true),
}).strict();
```

Add the same new fields to `enterpriseContractSchema`, `upsertEnterpriseContractRequestSchema`, and the estimate/preview response:

- `includedDoctors`, `includedPrescriptions`, `includedInvoices`
- `overageDoctorCents`, `overagePrescriptionCents`, `overageInvoiceCents`
- `setupFeeCents`, `dedicatedSupportCents`
- `customLineItems`

The invoice-preview endpoint returns normalized line items, not raw model columns:

```typescript
{
  period: { start: string; end: string };
  currency: string;
  lines: Array<{
    key: string;
    label: string;
    quantity: number;
    included: number;
    overage: number;
    unitCents: number;
    chargeCents: number;
    source: "SYSTEM" | "CUSTOM";
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}
```

### R17. Internal portal pricing workflow

Internal staff must be able to set the full enterprise commercial package without touching the database directly.

- Contract editor sections:
  - Commercial: `platformFeeCents`, billing cycle, currency, annual prepay discount, true-up threshold.
  - Included usage: users, doctors, consultations, WhatsApp messages, prescriptions, invoices, storage GB, branches.
  - Overage rates: one rate for each included usage dimension.
  - Flat fees: one-time setup fee and monthly dedicated support retainer.
  - Custom enterprise features: repeatable line-item editor backed by `customLineItems`.
  - Dedicated setup: display-only status in v1 (`NOT_REQUESTED`, `SCOPING`, `PROVISIONING`, `LIVE`, `SUSPENDED`) until infrastructure automation exists.
- The editor must show `Preview invoice` before save when pricing fields changed. The preview calls `POST /internal/enterprise-contracts/:contractId/invoice-preview`; for new draft contracts it can call the same endpoint with the unsaved payload in the body.
- Saving an active contract requires `changeSummary`; draft contracts may default the summary to `Created draft` or `Updated draft`.
- Every save writes one `EnterpriseContractRevision` with the previous snapshot. Do not write multiple revisions for a single UI save, even if members/subscriptions are also mirrored.
- Existing enterprise quote presets should be updated to include doctor, prescription, invoice, setup, and support defaults. Suggested defaults:
  - `MID_ENTERPRISE`: 10 doctors, 20,000 consultations, 30,000 WhatsApp messages, 10,000 prescriptions, 10,000 invoices, INR 25,000 monthly base, INR 50,000 setup.
  - `MULTI_SITE`: 30 doctors, 80,000 consultations, 100,000 WhatsApp messages, 40,000 prescriptions, 40,000 invoices, INR 75,000 monthly base, INR 150,000 setup.
  - `NETWORK`: 100 doctors, 250,000 consultations, 300,000 WhatsApp messages, 125,000 prescriptions, 125,000 invoices, INR 200,000 monthly base, INR 500,000 setup.

### R18. Full enterprise option definition

"Full enterprise" means an enterprise contract can describe, price, and operationally track all of the following, even if dedicated deployment automation ships after the billing work:

- Hospital identity: app display name, logo, legal entity name, support email, support phone, custom domain, and hospital name in email/WhatsApp templates.
- Hospital WhatsApp: BYO or Docita-managed sender number, sender verification status, token lifecycle, fallback state, and template approval notes.
- Hospital billing: custom contract pricing, custom line items, one-time setup fee, recurring support fee, invoice preview, revisions, and true-up alerts.
- Hospital infrastructure: dedicated database, dedicated API/worker apps, dedicated frontend deployment, dedicated object storage, dedicated secrets, custom domain, backup/restore policy, and support runbook.
- Hospital support: implementation owner, support tier, go-live date, onboarding checklist, and escalation notes stored in internal-only contract metadata.

Add a typed `enterpriseDeployment` JSON object or additive columns only if the implementation needs queryable state. Suggested v1 JSON shape:

```typescript
{
  status: "NOT_REQUESTED" | "SCOPING" | "PROVISIONING" | "LIVE" | "SUSPENDED";
  customerSlug?: string;
  region?: "ap-south-1" | "other";
  appDomain?: string;
  apiBaseUrl?: string;
  databaseProvider?: "RDS" | "Neon" | "Supabase" | "Other";
  storageProvider?: "R2" | "S3" | "Other";
  provisionedAt?: string;
  supportOwnerUserId?: string;
}
```

Do not store infrastructure secrets in this JSON. Use `ClinicSecret`/future vault integration for secrets and only store non-sensitive references.

### R19. Pricing calculation rules

The pricing engine must be deterministic and explainable in the invoice preview.

- Base monthly charge is always `platformFeeCents`.
- `setupFeeCents` appears only on the first enterprise invoice for a contract term unless staff explicitly add it again as a manual custom line item.
- `dedicatedSupportCents` appears every billing period while the contract is `ACTIVE`.
- For each metered dimension, `overage = max(0, used - included)` and `charge = overage * unitCents`.
- Doctors are calculated as the monthly peak count of active doctor memberships across all active contract member clinics.
- Consultations count completed appointments only. Do not double-count appointment creation and consultation completion.
- Prescriptions count created/signed prescriptions once by prescription ID.
- Invoices count generated clinic invoices once by invoice ID.
- WhatsApp messages count successfully accepted outbound provider sends. Failed sends should be observable but not billable.
- Custom line items with `source = "USAGE_RECORD"` use the mapped usage type. Custom line items with `source = "MANUAL"` require a staff-entered quantity during invoice creation/preview and must show the actor in audit metadata.
- Existing contracts with all new fields defaulted to zero must invoice exactly as they do before this change.

### R20. Final acceptance checklist for this feature set

The work is ready for beta only when these checks pass:

- A clinic on any tier that already has `WHATSAPP_MESSAGING` sees its clinic/hospital name inside outgoing WhatsApp content while still using the shared Docita sender.
- A Professional-or-higher clinic can configure BYO WhatsApp credentials, verify them, send outbound reminders/templates from that number, and receive inbound replies in the correct clinic inbox.
- A Hospital/Enterprise clinic can enter the managed WhatsApp flow and receives a clear "contact support / provisioning" state until Meta Embedded Signup is live.
- Internal staff can create and edit enterprise contracts with base fee, doctors, consultations, WhatsApp messages, invoices, prescriptions, setup fee, support fee, and custom features.
- Invoice preview matches a hand-calculated sample contract and writes no billing rows.
- Activating/changing an enterprise contract creates exactly one revision, emits audit metadata, and does not leak PHI or secrets.
- Existing non-enterprise subscriptions and existing enterprise contracts are unchanged when the new dynamic-pricing flag is off.
- `pnpm check:prisma-boundary`, targeted API tests, targeted internal portal tests, and relevant type checks pass before the beta flag is enabled.

---

## Out of scope (explicit non-goals)

- Migrating Meta-side template approvals for BYO clinics — they own their WABA's template library.
- Multi-region dedicated deploys (single-region Phase D first).
- Automatic data fork from shared DB to dedicated DB (Phase D tool).
- Cross-clinic branding when a user belongs to several clinics (separate UX problem).
- Stripe support — codebase is Razorpay-only; not changing payment processors in this plan.
