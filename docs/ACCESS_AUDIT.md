# Access audit: roles, tiers, and features

This document records non-negotiables and the audit methodology for Docita’s clinic-facing apps and API. It is the human-facing companion to automated checks (`packages/types/test/access.test.ts`, app policy tests, API specs).

## Non-negotiables

1. **Default deny on the server.** Every sensitive read (list, detail, search, export) and write must enforce `@Roles` / `RolesGuard`, tenant scope (`clinicId`, patient-in-clinic), and—where defined—`TierGuard`, `@RequireFeature`, and permission requirements from [`packages/types/src/access/access-matrix.ts`](../packages/types/src/access/access-matrix.ts).
2. **The UI is not authoritative.** `PageAccessGuard`, `RoleGuard`, `FeatureGuard`, and `canAccessTarget` in `apps/app` exist to prevent wrong navigation and to guide upgrades. They must not be the only enforcement layer.
3. **Single sources of truth.**
   - Roles and app permissions: `APP_ACCESS_MATRIX`, `APP_PERMISSIONS_BY_ROLE`, `hasAppPermission`.
   - Tier per feature: `FEATURE_TIER_MAP` in [`packages/types/src/billing/tier.ts`](../packages/types/src/billing/tier.ts).
   - Clinic tier string normalization: `mapClinicTierDbStringToAccessTier` in [`packages/types/src/access/clinic-tier-map.ts`](../packages/types/src/access/clinic-tier-map.ts) (used by the app permission store and subscription tier UX).
4. **Information leakage** includes: returning sensitive fields on 403, exposing aggregate counts to unauthorized roles, hub pages that advertise or deep-link capabilities denied by the matrix, and broad `PUT` handlers that persist tier-gated settings without `assertClinicHasFeatureOrThrow`.

## Inventory driver

For each `APP_ACCESS_TARGET` in `APP_ACCESS_MATRIX`:

| Column | Source |
|--------|--------|
| Target | `APP_ACCESS_TARGETS.*` |
| Feature / tier | `policy.feature`, `policy.tier` |
| Roles / permissions | `policy.read` / `policy.write` |
| Frontend route | [`apps/app/lib/access-routes.ts`](../apps/app/lib/access-routes.ts) |
| Nav / palette | [`apps/app/features/_shared/components/navigation/nav-config.ts`](../apps/app/features/_shared/components/navigation/nav-config.ts), command palette |
| Settings tab | [`apps/app/features/settings/constants.ts`](../apps/app/features/settings/constants.ts) + [`use-settings-logic.ts`](../apps/app/features/settings/hooks/use-settings-logic.ts) |

## Exhaustive discovery (run periodically)

- **Frontend (`apps/app`):** ripgrep `Feature\.`, `canAccess(`, `canAccessTarget`, `APP_ACCESS_TARGETS`, `FeatureGuard`, `RoleGuard`, `getAccessTargetForPath`, and deep-link path strings. Classify each hit as matrix-aligned or implicit (copy-only, hub, or missing gate).
- **`packages/data-access`:** this package provides generic HTTP helpers (`client-factory`, `crud-resource`, etc.). Clinic API paths primarily live under `apps/app/hooks/api`—map those paths to `APP_ACCESS_TARGETS` and ensure React Query `enabled` respects `canAccess` / `canAccessTarget` at the callsite when the route is gated.
- **Backend (`apps/api`, `apps/worker`):** for every `@Controller`, list guards; ripgrep `@RequireFeature`, `TierGuard`, `assertClinicHasFeatureOrThrow`, `SkipSubscriptionCheck`, `bypassesSessionGuards`. Trace services invoked from HTTP, workers, and webhooks.

## Implemented hardening (this pass)

- **Clinic settings `PUT`:** [`ClinicSettingsService`](../apps/api/src/domains/clinics/application/services/clinic-settings.service.ts) calls `assertClinicHasFeatureOrThrow` when the payload touches WhatsApp-related keys, queue, invoicing reminders, audit logs, or bundled auto-reminder fields aligned to `FEATURE_TIER_MAP`.
- **Inbox hub:** [`apps/app/app/(protected)/inbox/page.tsx`](../apps/app/app/(protected)/inbox/page.tsx) filters tabs using `canAccessTarget` and `manageStaff` so tier- and role-gated shortcuts are not shown.
- **Notification settings:** WhatsApp toggle is shown only when `Feature.WHATSAPP_MESSAGING` is allowed; otherwise a billing upgrade hint is shown and WhatsApp fields are omitted from saves.
- **Tier string mapping:** `mapClinicTierDbStringToAccessTier` unifies legacy Prisma tier strings for the permission store and `useTierAccess`.

## Traceability appendix (high-risk rows)

Keep this table aligned with `APP_ACCESS_TARGETS` and real call paths. When you add a route or hook, add or update a row and extend automated tests where practical.

| Capability | Frontend / surface | Client / hook | HTTP API | Nest controller |
|------------|-------------------|-----------------|----------|-----------------|
| WhatsApp stats & automation | `/whatsapp`, dialogs | [`use-whatsapp.ts`](../apps/app/hooks/api/use-whatsapp.ts) (`/whatsapp/*`) | `GET /whatsapp/stats`, `PUT /whatsapp/settings`, … | [`WhatsappController`](../apps/api/src/shared/modules/messaging/whatsapp/whatsapp.controller.ts) (`TierGuard` + `@RequireFeature(API_WHATSAPP)`) |
| WhatsApp v2 send | (same) | Domain client if used | `GET /whatsapp-v2/templates`, `POST /whatsapp-v2/messages/send` | [`WhatsAppController`](../apps/api/src/domains/whatsapp/presentation/controllers/whatsapp.controller.ts) |
| Medical coding (ICD/CPT, settings) | `/coding-queue`, settings | [`use-medical-coding.ts`](../apps/app/hooks/api/use-medical-coding.ts), [`use-settings.ts`](../apps/app/hooks/api/use-settings.ts) (`/clinical/medical-coding/*`) | `GET /clinical/medical-coding/icd/search`, `PUT /clinical/medical-coding/settings`, … | [`MedicalCodingController`](../apps/api/src/domains/clinical/presentation/controllers/medical-coding.controller.ts) (`TierGuard` + `@RequireFeature(API_MEDICAL_CODING)`) |
| Subscription billing | Settings billing, subscription workspace | [`use-billing.ts`](../apps/app/hooks/api/use-billing.ts), [`use-billing-history.ts`](../apps/app/hooks/api/use-billing-history.ts) | `GET /subscription/billing`, `GET /subscription/billing/payments`, … | Subscription / billing controllers (`APP_ACCESS_TARGETS` via guards; see matrix) |
| Invoices | `/invoices`, patient billing | [`use-billing.ts`](../apps/app/hooks/api/use-billing.ts) | `GET /POST /invoices`, … | Invoices domain (tier for clinic-wide list; see [`invoices.e2e-spec.ts`](../apps/api/test/invoices.e2e-spec.ts)) |
| Patient list / detail | `/patients/*` | [`use-patients.ts`](../apps/app/hooks/api/use-patients.ts), timeline hooks | `GET /patients`, `GET /patients/:id`, … | Patients module (`API_PATIENTS` / `BASIC_PATIENT_MANAGEMENT`) |
| Clinic settings (broad PUT) | Settings general / notifications | [`use-settings.ts`](../apps/app/hooks/api/use-settings.ts) | `PUT /clinic/settings` | [`ClinicSettingsController`](../apps/api/src/domains/clinics/presentation/controllers/clinics.controller.ts) + [`ClinicSettingsService`](../apps/api/src/domains/clinics/application/services/clinic-settings.service.ts) (`assertTierGatedSettingsAllowed`) |
| Internal ops | N/A (INTERNAL only) | N/A | `GET /internal/clinics`, … | Internal controllers |

### Automated tests (extend here first)

| Suite | What it covers |
|-------|----------------|
| [`apps/api/test/rbac-high-risk-matrix.e2e-spec.ts`](../apps/api/test/rbac-high-risk-matrix.e2e-spec.ts) | Table-driven **403**s: Starter tier vs WhatsApp + medical coding; NURSE vs medical coding; DOCTOR/NURSE vs subscription billing |
| [`apps/api/test/rbac-403-verification.e2e-spec.ts`](../apps/api/test/rbac-403-verification.e2e-spec.ts) | Internal routes, subscription billing (no clinic), consent cross-clinic |
| [`apps/api/test/invoices.e2e-spec.ts`](../apps/api/test/invoices.e2e-spec.ts) | Invoicing tier for clinic-wide `GET /invoices` |
| [`apps/app/lib/access-policy.matrix.test.ts`](../apps/app/lib/access-policy.matrix.test.ts) | Client-side `canAccessTarget` vs `FEATURE_TIER_MAP` for selected `PAGE_*` targets |

Run API matrix e2e locally (requires test `DATABASE_URL`):

`pnpm --filter @docita/api exec jest test/rbac-high-risk-matrix.e2e-spec.ts`
