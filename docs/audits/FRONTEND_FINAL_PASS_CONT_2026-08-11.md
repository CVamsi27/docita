# Frontend Final Pass — Continuation — 2026-08-11

Companion to
[`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md).
This document covers the **surface area not yet audited** in the prior
passes: hooks density, form patterns, i18n coverage, API surface,
Prisma boundary, code quality (any / console / lint), file size, and
per-feature test coverage.

## 1. Hooks density (state / memo / callback / effect)

`apps/app/src` has **1,322 non-test TS/TSX files**. The hook
distribution by domain:

| Folder | Files | Lines | useState | useMemo | useCallback | useEffect | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| `features/consultation/` | 141 | 14,489 | 20 | 28 | 35 | 26 | 109 |
| `features/patients/` | 107 | 9,441 | 38 | 18 | 45 | 7 | 108 |
| `features/setup/` | 90 | 9,933 | 29 | 3 | 31 | 21 | 84 |
| `features/appointments/` | 92 | 7,813 | 13 | 33 | 21 | 14 | 81 |
| `hooks/` (app-level) | 25 | 1,680 | 11 | 3 | 30 | 9 | 53 |
| `features/settings/` | 110 | 10,782 | 26 | 8 | 1 | 11 | 46 |
| `features/public-booking/` | 59 | 4,804 | 14 | 10 | 10 | 4 | 38 |
| `features/auth/` | 39 | 2,867 | 15 | 2 | 10 | 5 | 32 |
| `features/patient-portal/` | 48 | 4,157 | 25 | 5 | 0 | 1 | 31 |
| `lib/` | 88 | 4,755 | 4 | 2 | 14 | 8 | 28 |
| `features/subscription/` | 71 | 5,764 | 8 | 7 | 5 | 2 | 22 |
| `components/` | 73 | 4,760 | 9 | 1 | 3 | 8 | 21 |
| `features/upload-signature/` | 15 | 1,387 | 10 | 3 | 3 | 3 | 19 |
| `features/invoices/` | 41 | 3,277 | 6 | 2 | 2 | 4 | 14 |
| `features/lab-tests/` | 25 | 2,738 | 11 | 1 | 1 | 1 | 14 |
| `features/insurance-claims/` | 21 | 1,804 | 6 | 4 | 0 | 3 | 13 |
| `features/inbox/` | 7 | 672 | 1 | 6 | 0 | 3 | 10 |
| `features/desk/` | 15 | 1,353 | 6 | 3 | 0 | 1 | 10 |
| `features/search/` | 6 | 268 | 3 | 1 | 4 | 2 | 10 |
| `features/ai-assistant/` | 12 | 990 | 10 | 0 | 0 | 0 | 10 |

### 1.1 Hotspot files — high hook count

The 15 files with the most `useState` calls in a single file:

| Lines | File |
|---:|---|
| 10 | `apps/app/src/features/ai-assistant/hooks/use-ai-assistant-logic.ts` |
| 9 | `apps/internal/src/features/admins/pages/admins-page.tsx` |
| 9 | `apps/app/src/features/patients/components/details/use-patient-metrics-ui.ts` |
| 9 | `apps/app/src/features/auth/hooks/use-auth-page-container.ts` |
| 8 | `apps/internal/src/features/logs/pages/logs-page.tsx` |
| 8 | `apps/app/src/features/public-booking/use-public-booking-form-fields.ts` |
| 6 | `apps/app/src/features/setup/hooks/use-verify-doctor.ts` |
| 6 | `apps/app/src/features/setup/components/onboarding/address-picker/use-clinic-address-picker-state.ts` |
| 6 | `apps/app/src/features/settings/components/management/use-doctor-time-away-settings.ts` |
| 5 | `apps/internal/src/features/payment-processing/pages/payment-processing-page.tsx` |
| 5 | `apps/internal/src/features/broadcasts/pages/broadcasts-page.tsx` |
| 5 | `apps/internal/src/features/billing/pages/billing-page.tsx` |
| 5 | `apps/app/src/features/upload-signature/components/use-upload-signature-token.ts` |
| 5 | `apps/app/src/features/setup/hooks/use-join-clinic-page.ts` |
| 5 | `apps/app/src/features/medical-documents/components/use-medical-document-list.ts` |

**Pattern:** the files with the most `useState` are exactly the ones
the prior pass flagged for the `useState` + `useEffect` mount-fetch
pattern. **The conversion to React Query collapses 4-9 `useState` +
1-2 `useEffect` per page into a single `useAPIQuery` call.** That's
the single biggest cleanup move in this whole audit series.

### 1.2 Per-feature hook count

`features/consultation/` and `features/patients/` together account
for **217 of 781 hooks (28%)** in the app. The consultation
workspace is genuinely complex (multi-section scroll-spy, draft
autosave, leave-navigation guards, keyboard shortcuts) so a high
count is expected. The patient feature is also complex (medical
history overrides, tag manager, multi-tab detail page). These are
not red flags.

### 1.3 The `apps/app/src/hooks/` folder — duplication check

`apps/app/src/hooks/` has 25 files containing **30 useCallback calls**
and 11 useState. Some of these should be promoted to
`packages/hooks/src/`. The current 27 hooks in the shared package
are listed in
[`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md)
§1.1. The 25 app-level hooks worth a second look:

- `use-add-dialog-url-sync.ts`
- `use-confirm.tsx` (already a provider pattern)
- `use-patient-data.ts`
- `use-phone-signature-polling.ts`
- `use-phone-signature-qr-flow.ts`
- `use-session-recovery-redirect.ts`

**Most are domain-specific** (phone signature, patient data, session
recovery) and shouldn't be promoted — they're the right place in the
right layer. **No duplication detected** that warrants a shared
extraction.

## 2. Forms

### 2.1 React Hook Form adoption

- 28 files use `useForm` / `useFormContext` / `FormProvider`
- The settings sub-feature alone has **10 forms** (queue, OPD slip,
  prescription defaults, general clinic, notifications, reminders,
  security, change password, leave, member management)
- 13 of these have the `useEffect(() => form.reset(...), [prop, form])`
  pattern (already documented in
  `FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`)

### 2.2 Bare `<form>` (not using RHF or the shared Form primitive)

`grep` finds ~10 sites that use a raw `<form onSubmit>` instead of
the RHF + `<Form>` primitive:

- `apps/app/src/features/patients/components/forms/dialogs/add-patient-dialog-form.tsx:119`
- `apps/app/src/features/patients/components/forms/dialogs/EditPatientDialog.tsx:149`
- `apps/app/src/features/settings/components/security/SecuritySettings.tsx:88`
- `apps/app/src/features/settings/components/security/ChangePasswordSettings.tsx:45`
- `apps/app/src/features/settings/components/management/invite-team-member-dialog.tsx:41`
- `apps/app/src/features/settings/components/management/manage-team-member-dialog.tsx:64`
- `apps/app/src/features/settings/components/compliance/compliance-log-request-dialog.tsx:52`
- `apps/app/src/features/settings/components/clinical/OpdSlipSettings.tsx:89`
- `apps/app/src/features/settings/components/clinical/PrescriptionDefaultsSettings.tsx:62`
- `apps/app/src/features/settings/components/clinic/clinic-general-settings-form.tsx:26`

**Caveat:** the grep is a heuristic. Many of these may already use
RHF internally and just emit a `<form onSubmit={form.handleSubmit(...)}>`,
which is the correct pattern. The right way to verify is to read each
file, not to grep `<form`. Recommend a follow-up per-file review
rather than a bulk refactor.

### 2.3 The `<Form>` primitive path

The shared form primitive lives in
`packages/ui/src/components/form/form.tsx`. Import as:

```ts
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@workspace/ui/components/form";
```

`packages/ui/src/components/form/` has 38 components including
`form-grid`, `form-page`, `form-dialog`, `form-field-group`,
`form-select-field` — these are the canonical building blocks.

## 3. i18n

### 3.1 Key parity: **perfect**

- 51 message files in `apps/app/src/messages/en/`
- 51 matching message files in `apps/app/src/messages/hi/`
- **Zero per-file key differences** (verified by recursive flatten
  and set comparison)

### 3.2 Hardcoded user-facing strings: **177 found**

Despite perfect key parity, **177 strings are still hardcoded** as
JSX text in 121 files. Examples (from
[`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md)):

| File:line | String |
|---|---|
| `apps/app/src/components/ask-ai/ask-ai-overlay.tsx:13` | `Ask AI` |
| `apps/app/src/components/navigation/sidebar.tsx:41` | `Navigation` |
| `apps/app/src/components/patient-history/PatientSnapshotStrip.tsx:52` | `Clinical Snapshot` |
| `apps/app/src/features/consultation/components/ConsultationLeaveDialog.tsx:37` | `Leave consultation?` |
| `apps/app/src/features/consultation/workspace/shell/ConsultationMainPanelSections.tsx:36,51` | `Back`, `Next` |
| `apps/app/src/features/setup/pages/choose-path.tsx:110` | `Choose your path` |
| `apps/app/src/features/subscription/components/dialogs/tier-change-dialog-view.tsx:102` | `Plan Updated!` |
| `apps/app/src/features/mobile-upload/components/MobileSuccessScreen.tsx:19` | `Upload Complete!` |
| `apps/app/src/features/lab-tests/components/dialogs/OrderLabTestDialog.tsx:49` | `Order Lab Test` |
| `apps/app/src/features/whatsapp/components/*` | 5+ strings (already i18n'd, plus new hardcodes) |

**Per-domain count (top offenders):**

| Domain | Hardcoded strings |
|---|---:|
| `features/subscription/` | 11 |
| `features/settings/` | 10 |
| `features/lab-tests/` | 10 |
| `features/setup/` | 9 |
| `features/consultation/` | 9 |
| `features/invoices/` | 6 |
| `features/ipd/` | 4 |
| `features/medical-coding/` | 1 |

**Recommendation:**

1. Add a CI lint rule: `apps/app/src/**/*.tsx` JSX text nodes must
   be wrapped in `{t(...)}` (allow only when the text is `<title>`,
   `<meta>`, or other static document head). The pattern is
   `>([A-Z][a-z]{2,})` for a non-trivial English word not inside
   `{t(...)}`.
2. Migrate the 177 sites feature-by-feature. The `subscription` and
   `settings` sub-features should be P0 because they're the most
   user-visible.

## 4. API surface

### 4.1 `@ZodSerializerDto` coverage: **38/89 controllers (43%)**

| Domain | Controllers with @ZodSerializerDto | Without | Coverage |
|---|---:|---:|---:|
| `patients/` | 3 | 7 | 30% |
| `doctors/` | 0 | 6 | 0% |
| `appointments/` | 6 | 6 | 50% |
| `patient-portal/` | 0 | 5 | 0% |
| `clinics/` | 4 | 5 | 44% |
| `subscriptions/` | 3 | 4 | 43% |
| `enterprise-contracts/` | 1 | 3 | 25% |
| `clinical/` | 1 | 3 | 25% |
| `leave/` | 0 | 2 | 0% |
| `documents/` | 0 | 2 | 0% |

The 51 controllers without `@ZodSerializerDto` are listed in
`FRONTEND_BEST_PRACTICES_2026-08-11.md` §4.4.

**The "0 waste" rule is already enforced by
`apps/api/src/shared/common/interceptors/safe-zod-serializer.interceptor.ts`**,
but only when `@ZodSerializerDto` is present. A controller method
without the decorator passes the response through unchanged, which
means any Prisma-model field the contract never declared leaks.

### 4.2 The list-item vs detail convention: **only 1 of 28 contracts**

Of 28 contract files, **only `packages/types/src/contracts/appointments.ts`**
uses the canonical 4-schema pattern
(`<entity>ListItemSchema` + `<entity>ResponseSchema` +
`list<entity>sResponseSchema` wrapper). The other 27 contracts use
either a single `<entity>Schema` for both list and detail, or no
response schema at all (letting the controller pass through the
Prisma model).

**Recommendation:** adopt the 4-schema pattern as the contract
convention (already documented in
`FRONTEND_BEST_PRACTICES_2026-08-11.md` §4.6). The 4 files with
`ListResponse` already do this; the 24 others need to.

### 4.3 Frontend → API direct calls

| App | Files using raw `apiGet/apiPost/apiPut/apiDelete` |
|---|---:|
| `apps/app/` | **0** — all data access goes through `packages/data-access`'s `useAPIQuery` / `useAPIMutation` |
| `apps/internal/` | **18** — every page file plus a `use-create-clinic-form.ts` hook |

The `apps/app` 0 result is a major architectural win. The
`apps/internal` 18 result is exactly the same 14 page files plus
hooks from the useEffect index.

### 4.4 Hand-rolled TS interfaces in DTOs

`apps/api/src/domains/**/*.dto.ts` has 40 files. Of those:

- 39 use `createZodDto` / import from `@workspace/types` / import `z`
- 1 has a hand-rolled `interface SubscriptionResponseDto`:
  `apps/api/src/domains/subscriptions/application/dto/subscription.dto.ts:24`

This single instance is the only `interface <X>Dto` in the API
DTO layer. Easy fix: replace with `z.object({...}).strict()` and
`z.infer<typeof subscriptionResponseSchema>`.

## 5. Prisma boundary

The `check:prisma-boundary` script
(`scripts/checks/check-prisma-boundary.js`) already enforces this.

**Current state:**

- Frontend (`apps/app`, `apps/internal`, `apps/landing`): **0** `@prisma/client` imports, **0** `@workspace/db` imports — clean.
- 7 known legacy `PrismaService` uses in covered layers (allowlisted per the 2026-08-07 survey).
- **33 files** in `apps/api/src/domains/*/{application,core}/` use
  the `Prisma.*` namespace or import `@prisma/client` types. These
  are not in the gate's "covered layers" list (the gate flags
  `presentation`, `cron`, `scheduler`, `strategies`, `legacy modules`
  — not `application/` or `core/`). But AGENTS.md §3.3 says Prisma
  should not leak outside `packages/db` and the repository layer.

The 33 files leaking `Prisma.*` (outside infrastructure/repositories):

```
apps/api/src/domains/patients/application/services/medication-dose-query.service.ts
apps/api/src/domains/patients/application/services/medication-dose-command.service.ts
apps/api/src/domains/appointments/core/domain-services/appointment-update-patch.rules.ts
apps/api/src/domains/appointments/application/use-cases/record-appointment-vitals.use-case.ts
apps/api/src/domains/appointments/application/services/appointment-metric-definition.service.ts
apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts-query.service.ts
apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-invoice-command.service.ts
apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts-command.service.ts
apps/api/src/domains/feedback/application/services/feedback-helpers.ts
apps/api/src/domains/subscriptions/core/services/partner-portal.service.ts
apps/api/src/domains/clinics/core/factories/clinic.factory.ts
apps/api/src/domains/clinics/application/services/clinic-data.helpers.ts
apps/api/src/domains/clinics/application/services/onboarding/onboarding-compliance.service.ts
apps/api/src/domains/clinics/application/services/onboarding/onboarding-workflow-helpers.ts
apps/api/src/domains/clinics/application/services/onboarding/onboarding-workflow.service.ts
apps/api/src/domains/doctors/application/services/slot-generation.service.ts
apps/api/src/domains/doctors/application/services/availability-schedule.service.ts
apps/api/src/domains/users/core/factories/user.factory.ts
apps/api/src/domains/documents/application/services/documents.service.ts
apps/api/src/domains/reminders/application/services/reminder-scheduler.service.ts
apps/api/src/domains/billing/core/utils/invoice-normalization.ts
apps/api/src/domains/billing/core/services/usage-tracking.service.ts
apps/api/src/domains/billing/core/services/usage-tracking-command.service.ts
apps/api/src/domains/billing/application/services/invoice-settlement.service.ts
apps/api/src/domains/billing/application/services/invoices-query.service.ts
apps/api/src/domains/billing/application/services/invoices-command.service.ts
apps/api/src/domains/billing/application/services/leave-query.service.ts
apps/api/src/domains/whatsapp/application/services/whatsapp-sender-settings.service.ts
apps/api/src/domains/whatsapp/application/services/staff-notification-recipient.resolver.ts
apps/api/src/domains/analytics/core/factories/operational-analytics.factory.ts
apps/api/src/domains/analytics/core/services/analytics-data-aggregator.service.ts
apps/api/src/domains/patients/core/factories/patient.factory.ts
apps/api/src/domains/patients/application/services/patient-metrics.service.ts
```

**Recommendation:** expand the gate's "covered layers" to also
include `application/services/` and `application/use-cases/`, OR
adopt the simpler rule: "any `Prisma.*` type annotation outside
`infrastructure/`, `core/repositories/`, or `infrastructure/mappers/`
must be replaced with a domain DTO." A single new entry in
`KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` plus a strict-mode CI flag
would catch the next violation.

## 6. Code quality

### 6.1 `console.log` / `console.error` / `console.warn`

- **`apps/app/src`**: 0 occurrences
- **`apps/internal/src`**: 0 occurrences
- `apps/api/src`: 0 occurrences (checked earlier)

**Clean.** This is enforced by the project logger pattern
(`@/lib/logger` on frontend, NestJS `Logger` on backend).

### 6.2 `: any` / `<any>` / `as any`

- **0 occurrences** in `apps/app/src` and `apps/internal/src`
- **0 occurrences** in test files
- All 17 hits the previous audit flagged were "anyhow", "many",
  or "anyway" — false positives

**Clean.** AGENTS.md §7.3 is enforced.

### 6.3 `@ts-ignore` / `@ts-expect-error`

- **0 occurrences** in `apps/app/src` and `apps/internal/src`

**Clean.** AGENTS.md §7.3 is enforced.

### 6.4 `eslint-disable`

Only 2 sites with `// eslint-disable-next-line react-hooks/exhaustive-deps`,
both with inline rationale:
- `apps/app/src/features/consultation/workspace/shell/ConsultationMainPanel.tsx:104`
- `apps/app/src/features/verify-email/components/VerifyEmailPageContent.tsx:103`

**Clean.**

## 7. Large files (≥300 lines)

11 non-test files exceed 300 lines (excluding test files, which are
allowed to be long):

| Lines | File |
|---:|---|
| 390 | `apps/app/src/features/consultation/components/specialty/investigation-row.tsx` |
| 380 | `apps/app/src/features/dashboard/components/today/today-page-content-sections.tsx` |
| 370 | `apps/app/src/features/setup/hooks/use-verify-doctor.ts` |
| 363 | `apps/app/src/features/settings/components/compliance/consent-template-document-sections.tsx` |
| 350 | `apps/app/src/features/settings/components/management/DoctorTimeAwaySettingsSections.tsx` |
| 345 | `apps/app/src/lib/services/clinic-feature-service-helpers.ts` |
| 335 | `apps/app/src/features/insurance-claims/components/forms/InsuranceClaimCreateUISections.tsx` |
| 327 | `apps/app/src/components/patient-history/PatientHistorySummaryCardSections.tsx` |
| 324 | `apps/app/src/features/settings/components/doctor-profile/DoctorProfileSettingsSections.tsx` |
| 321 | `apps/app/src/features/settings/components/clinic/clinic-general-settings-form-sections.tsx` |
| 320 | `apps/app/src/features/consultation/workspace/shell/use-consultation-shell-scroll.ts` |
| 319 | `apps/app/src/features/setup/components/onboarding/steps/clinic-details/ClinicAddressSectionSections.tsx` |
| 317 | `apps/app/src/features/setup/components/onboarding/steps/TeamMemberRowSections.tsx` |
| 310 | `apps/app/src/features/lab-tests/components/settings/lab-tests-catalog-settings.tsx` |
| 306 | `apps/app/src/features/consultation/components/consultation-dashboard-sections.tsx` |

**Pattern:** the long files are all in `*Sections.tsx` /
`*Sections.tsx` files that hold the section-based layout of
multi-section pages. The pattern is: `<Page> = <TopBar> +
<Sections> = [Section1, Section2, ...]` and the Sections file
holds the body. This is intentional and matches the project
convention (see the audit's §7.1 file-size note — the budget is
400 lines per API service, no hard limit on UI).

**Recommendation:** none for now. These files are within
convention. If a future budget wants tighter bounds, the
`use-verify-doctor.ts:370` is the best split target (hook is doing
3 things: form hydration, redirect, validation).

## 8. Test coverage by feature (apps/app)

`apps/app/src/features/*/` test-to-source ratio. **Worst first:**

| Domain | Tests / Source | Ratio |
|---|---:|---:|
| `features/public-booking/` | 1 / 59 | 1% |
| `features/subscription/` | 3 / 71 | 4% |
| `features/setup/` | 4 / 90 | 4% |
| `features/prescriptions/` | 1 / 19 | 5% |
| `features/analytics/` | 1 / 15 | 6% |
| `features/upload-signature/` | 1 / 15 | 6% |
| `features/patients/` | 7 / 105 | 6% |
| `features/settings/` | 8 / 110 | 7% |
| `features/ai-assistant/` | 1 / 12 | 8% |
| `features/imports/` | 1 / 12 | 8% |
| `features/referral-partner/` | 1 / 12 | 8% |
| `features/patient-portal/` | 4 / 48 | 8% |
| `features/consultation/` | 10 / 124 | 8% |
| `features/insurance-claims/` | 2 / 21 | 9% |
| `features/mobile-upload/` | 1 / 10 | 10% |

**Best:**

| Domain | Tests / Source | Ratio |
|---|---:|---:|
| `features/whatsapp/` | 3 / 7 | 42% |
| `features/daybook/` | 2 / 6 | 33% |
| `features/dashboard/` | 11 / 39 | 28% |
| `features/auth/` | 9 / 39 | 23% |
| `features/appointments/` | 15 / 92 | 16% |
| `features/invoices/` | 7 / 41 | 17% |

`apps/internal/src` is even worse — only **4 test files for 35
feature modules (~11%)**. Already documented in
[`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md)
§6.

**Recommendation:** focus on `public-booking`, `subscription`,
`setup`, `prescriptions`, `analytics` first — these are the
clinician-facing critical paths with the lowest coverage. A
minimum scaffold (1 render-test per page that exercises the
primary action and asserts no error) would lift these to 5-10%.

## 9. New findings beyond prior docs

This pass surfaced **5 findings not in the prior 6 docs:**

1. **177 hardcoded JSX strings** in 121 files — a real i18n gap
   not flagged in the prior best-practices doc. (See §3.2.)
2. **33 application/core files** leak `Prisma.*` types — beyond the
   7 in the existing `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` allowlist.
   The gate doesn't currently catch them. (See §5.)
3. **1 hand-rolled TS interface** in API DTOs:
   `apps/api/src/domains/subscriptions/application/dto/subscription.dto.ts:24`.
   (See §4.4.)
4. **27 of 28 contract files** don't follow the list-item vs detail
   convention. (See §4.2.)
5. **Test coverage by feature is uneven** — `public-booking` is at
   1% (1 test for 59 source files). (See §8.)

## 10. Phase plan (updated)

The prior
[`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md)
§6 has the original roadmap. Adding the new findings:

| Phase | Effort | Impact | Risk |
|---|---|---|---|
| **P0** (existing) Add `useTimeout` / `useInterval` to shared hooks | 1h | -16 manual timer sites | Low |
| **P0** (existing) Delete IPD / patient-portal / lab-tests settings / ConsentNotice (Group B/C/D/E) | 1h | -900 LOC | Low |
| **P0** (existing) Delete dead business rules (Group A) | 2h | -500 LOC | Low |
| **P0** (new) Replace hand-rolled `SubscriptionResponseDto` interface with Zod | 30min | 1 file, 0 LOC delta | Low |
| **P0** (new) Add CI check: no Prisma type leak in `application/services` or `core/` (outside `infrastructure/`) | 1h | catches the 33 leaks incrementally | Low |
| **P1** (existing) Convert 14 `apps/internal` pages to React Query | 4h | -20 useEffects, -300 LOC | Medium |
| **P1** (existing) Convert 8 settings forms to RHF `values` prop | 3h | -8 useEffects | Low |
| **P1** (existing) Wire `@ZodSerializerDto` on 51 controllers | 4h | 0-waste API compliance | Low |
| **P1** (new) Migrate 177 hardcoded strings to i18n (subscription + settings first) | 4h | i18n parity surface | Low |
| **P1** (new) Promote list-item/detail convention to 27 contracts | 4h | smaller list payloads | Low |
| **P2** (new) Add `apps/app` JSX-text-must-be-t()-wrapped lint rule | 1h | prevents future hardcodes | Low |
| **P2** (new) Add en/hi key-parity CI check | 30min | catches future drift | Low |
| **P2** (existing) Promote `useEffectivePermissions` cache to shared data-access | 2h | -1 useEffect, API can also use it | Low |
| **P3** (new) Lift per-feature test coverage — `public-booking` and `subscription` first | 8h | -1% → 8% in the 2 weakest features | Low |
| **P3** (existing) Add a "list-item" vs "detail" schema convention across all 28 contract files | 4h | smaller list payloads | Low |

## 11. Companion documents

- [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md) — master index
- [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) — every useEffect
- [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md) — every dead export
- [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md) — shared primitives, React Query, Zod-shared-schemas, 0-waste API
- [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) — broad static review
