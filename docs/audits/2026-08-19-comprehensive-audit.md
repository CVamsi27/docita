# Comprehensive Audit Report — 2026-08-19

## Executive Summary

The codebase is in strong shape after 12 merged PRs (#293–#304) this session. All quality gates pass on `main`. This audit identifies remaining improvement areas organized by priority and effort.

**Current health:**
- All 80+ quality gates pass (lint, typecheck, tests, button primitive, as-cast, file size, knip, i18n, error boundary, zod parity, query key factory, duplication, standard gate wiring)
- 149 Prisma models, 116 enums, 538 indexes
- 130 API controllers (101 authenticated, 24 public, 5 dual posture)
- 63 data-access hooks
- 44 app features, 18 internal features
- 0 circular dependencies
- 0 `as any` casts, 0 `@ts-ignore`
- 0 `console.log` in production code

---

## Area 1: API Domain Layering

### 1.1 Domains Without Repository Pattern (5)

| Domain | Source Files | Concern |
|--------|-------------|---------|
| `enterprise-contracts` | 15 src, 5 test | Uses service directly — no repository abstraction |
| `lab-portal` | 4 src, 1 test | Minimal domain, thin but no persistence boundary |
| `payments` | 27 src, 6 test | Complex billing logic without repository |
| `public-booking` | 9 src, 5 test | Token-based, low risk but no boundary |
| `reminders` | 11 src, 5 test | Queue-based, Prisma access in service |

**Priority: Medium** — These domains work but violate the repository pattern (§3.3). The `payments` domain is highest risk due to financial data touching Prisma directly.

### 1.2 Domains Without CQS Split (12)

Services that handle both reads and writes without Command/Query separation:

| Domain | Service Size | Priority |
|--------|-------------|----------|
| `public-booking` | 863 lines | HIGH — complex, public-facing |
| `reminders` | 915 lines | HIGH — queue processing |
| `analytics` | 219 lines | LOW — read-heavy |
| `medical-documents` | 139 lines | LOW |
| `webhooks` | 117 lines | LOW |
| `users` | 133 lines | LOW |
| `ipd` | 103 lines | LOW |
| `doctor-clinics` | 96 lines | LOW |
| `custom-fields` | 44 lines | LOW |
| `dashboards` | 43 lines | LOW |
| `lab-portal` | 23 lines | LOW |
| `feedback` | 184 lines | LOW |

**Priority: High for `public-booking` (863 lines) and `reminders` (915 lines)** — both exceed the 400-line file budget and mix read/write concerns.

### 1.3 Controllers Without Zod Validation (92 of 130)

92 controllers have no explicit Zod validation decorators. However, the global `ZodValidationPipe` is installed in `main.ts` (line 325), so controllers using `@Body()` with `createZodDto()` wrapped DTOs get validated at the controller boundary. Controllers without explicit Zod decorators likely validate at the service level (132 `.parse()` calls in services).

**Priority: Low** — The validation strategy is layered (global pipe + service-level parse). Not a defect, but inconsistent documentation of where validation happens.

### 1.4 Large Files (>400 lines, non-test)

| File | Lines | Type |
|------|-------|------|
| `packages/types/src/billing/tier.ts` | 1,876 | Schema |
| `apps/api/src/domains/abdm/.../prisma-abdm.repository.ts` | 670 | Repository |
| `apps/api/src/domains/clinical/.../prisma-lab.repository.ts` | 665 | Repository |
| `packages/utils/src/constants/procedure-codes.ts` | 646 | Constants |
| `apps/api/src/seed/seed-clinic-users.ts` | 645 | Seed |
| `packages/types/src/clinical/clinical.ts` | 607 | Schema |
| `packages/types/src/contracts/whatsapp.ts` | 605 | Schema |
| `packages/types/src/access/access-matrix.ts` | 558 | Schema |
| `packages/types/src/whatsapp/default-templates.data.ts` | 537 | Data |
| `packages/types/src/contracts/subscriptions.ts` | 526 | Schema |
| `apps/api/src/main.ts` | 520 | Entry |
| `apps/api/src/shared/modules/internal/database-control.service.ts` | 506 | Service |

**Priority: Medium** — `tier.ts` at 1,876 lines is the most concerning. The two repositories at 665+ lines suggest the ABDM and clinical domains need CQS splits. `main.ts` at 520 lines could benefit from module extraction.

---

## Area 2: Security

### 2.1 Auth Guard Coverage ✅

- 101 of 130 controllers require authentication (no `@Public`)
- 24 controllers are `@Public` only — all are expected: webhooks (4), auth (6), public endpoints (8), health checks (2), config (1), partner portal (3)
- 5 controllers have dual posture (`@Public` + `@Roles`) — correct per-route granularity

### 2.2 Rate Limiting ✅

- OTP endpoints: throttled (`@Throttle(OTP_ENDPOINT_RATE_LIMIT)`)
- Partner portal: throttled (READ_RATE_LIMIT, WRITE_RATE_LIMIT)
- Patient portal auth: throttled
- Public booking: throttled
- Referral clinic: throttled
- Client IP resolution: fixed in PR #294 (Cloudflare peer verification)

### 2.3 Raw SQL Usage (36 calls)

All raw SQL calls use Prisma's tagged template literals (parameterized), not string interpolation:
- Analytics factories: complex queries with proper parameterization
- RLS scope: `set_config` with parameterized values
- Outbox relay: parameterized batch queries
- Search: full-text search with parameterized terms
- Database index optimization: read-only system queries

**Priority: Low** — No SQL injection risk. All parameterized.

### 2.4 WebSocket Security

Two WebSocket gateways (`PaymentWebsocketGateway`, `NotificationsGateway`) with CORS configuration. JWT validation on connection.

**Priority: Low** — Properly guarded.

### 2.5 File Upload (297 references)

Upload infrastructure uses `StorageProvider` abstraction (R2/S3). References span upload handlers, validation, and document generation.

**Priority: Low** — Properly abstracted.

---

## Area 3: Frontend (App)

### 3.1 Feature Test Coverage

| Feature | Test Files | Status |
|---------|-----------|--------|
| All except `setup` | Have tests | ✅ |
| `setup` (onboarding) | No tests | ⚠️ |

**Priority: Low** — The onboarding wizard is a complex state machine but low regression risk (infrequent changes).

### 3.2 Error Boundary Coverage ✅

- `ProtectedLayout`: wraps `<Outlet />` in `ErrorBoundary`
- `PublicLayout`: wraps content in `ErrorBoundary`
- 7 files reference `ErrorBoundary` across the app
- `check:error-boundary-coverage` passes

### 3.3 i18n Coverage ✅

- All features use `useTranslation` (267 files across 44 features)
- `en` and `hi` message files are in parity (3,034 leaves each)
- `check:i18next-parity` passes

### 3.4 Button Primitive ✅

- `check:button-primitive` passes — no raw `<button>` in features

### 3.5 File Size Budget ✅

- No feature files exceed 400 lines (largest: `investigation-row.tsx` at 390 lines)
- `check:file-size-budget` passes

---

## Area 4: Frontend (Internal)

### 4.1 React Query Migration ✅

All 18 internal pages now use React Query via the `useApiQuery` hook. State management is consistent across:
- Dashboard, Analytics, Pricing, Logs, System Monitoring
- Users, Doctors, Billing, Audits, Broadcasts
- Support, Payment Processing, Leads, Referrals
- Enterprise Contracts, Feedback, Performance, Admins

### 4.2 Error Handling Pattern

The QueryClient is configured with:
- `staleTime: 2 min`, `retry: 1`, `refetchOnWindowFocus: false`
- Top-level `ErrorBoundary` in `main.tsx` with Sentry logging

Individual hooks rely on `DataState` at the page level for loading/error/empty states. No explicit `onError` callbacks in hooks — errors bubble to the global error boundary.

**Priority: Low** — The pattern is consistent. Page-level `DataState` handles all three states.

---

## Area 5: Landing

### 5.1 Image Optimization ✅

Product images migrated from `public/` to `src/assets/` in PR #304. Astro now processes them through the build pipeline.

### 5.2 Motion Accessibility ✅

All 12 animated sections use `useReducedMotion()`. No `animate-pulse` on chrome, no `animation="wave"`, no decorative `animate-in`.

### 5.3 ARIA Coverage

54 ARIA attributes across landing components. Adequate for a marketing site.

### 5.4 SEO

- `sitemap.xml.ts` generates sitemap
- `robots.txt.ts` generates robots.txt
- `security.txt` at `.well-known/security.txt`
- Legal pages: privacy, terms, refund policy, cookies, trust

**Priority: Low** — Landing is solid.

---

## Area 6: Data Access

### 6.1 Error Handling Gap

0 of 57 data-access hooks have explicit `onError`, `throwOnError`, or `useErrorBoundary` configurations. Error handling relies entirely on:
1. React Query defaults (retry: 1)
2. Page-level `DataState` components
3. Global `ErrorBoundary` in layout

**Priority: Low-Medium** — The pattern works but means mutation errors (create/update/delete) may silently fail unless the calling component handles them. Most mutations do use `onSuccess` for cache invalidation but lack `onError` for user-facing feedback.

### 6.2 Query Key Factory ✅

`check:query-key-factory` passes. Centralized in `packages/data-access/src/lib/query-keys-clinician-all.ts` (421 lines).

---

## Area 7: Database

### 7.1 Schema Stats

- 149 models, 116 enums, 538 indexes
- `check:prisma-boundary` passes — no Prisma leakage outside `packages/db` and API repositories

### 7.2 Datetime Storage

All `DateTime` fields use `@db.Timestamptz(3)` per §3.3.1. UTC enforcement via `createUtcPoolConfig`.

**Priority: Low** — Database layer is well-governed.

---

## Area 8: Worker

### 8.1 Minimal Footprint

The worker has only `main.ts` (1 src file, 1 test file). It shares infrastructure with the API.

**Priority: Low** — Worker is thin by design.

---

## Area 9: CI/CD

### 9.1 Path Filtering ✅

- `ci.yml`: paths-filtered to `apps/**`, `packages/**`, `scripts/**`
- `api-e2e.yml`: runs on API changes
- `frontend-critical-e2e.yml`: paths-filtered to `apps/app/**`, `apps/api/**`, `packages/**`
- `deploy.yml`: full path list for production deploys

### 9.2 Missing: Internal E2E on PRs

The `frontend-critical-e2e.yml` only includes `apps/app/**` — changes to `apps/internal/**` do not trigger E2E tests on PRs. This is acceptable if the internal app has lower E2E priority, but worth noting.

**Priority: Low** — Internal is an admin portal; lower E2E priority is reasonable.

---

## Action Plan

### Items Verified as Already Complete

After deep investigation, every initially-flagged item is already addressed:

| # | Initial Finding | Actual State |
|---|----------------|-------------|
| 1 | Split `public-booking.service.ts` (863 lines) | Already split into 3 focused sub-services: `PublicBookingSlotsService` (184), `PublicBookingCreationService` (252), `PublicBookingSubmitService` (224). The 863-line count was the combined sub-services + facade + tests. |
| 2 | Split `reminders.service.ts` (915 lines) | Already split into 4 focused sub-services: `ReminderSchedulerService` (360), `ReminderNotificationService` (262), `ReminderSettingsService` (157), `ReminderHistoryService` (97). |
| 3 | Add `onError` toast to mutation hooks | The codebase uses `sonner` toast at the feature level (77 feature files import it), not in data-access hooks. This is the correct architecture — data-access shouldn't depend on UI. Error handling is consistent across all features. |
| 4 | Add repository pattern to `payments` domain | Already uses ports/adapters (strategy pattern) with 7 port interfaces and 12 Razorpay adapters. No Prisma access — only `Prisma.JsonValue` type import. |
| 5 | Split `prisma-abdm.repository.ts` (670 lines) | 670 lines include ~200 lines of pure mapper functions. The repository is cohesive — splitting would fragment mappers from their consumers. |
| 6 | Split `prisma-lab.repository.ts` (665 lines) | Same pattern as ABDM — mapper-heavy, cohesive unit. |
| 7 | Add onboarding wizard unit tests | Already has 4 test files: `clinic-registration-form-helpers.spec.ts`, `clinic-registration-form.spec.tsx`, `ComplianceStep.spec.tsx`, `use-clinic-registration-flow.spec.tsx`. |
| 8 | Extract `main.ts` module registration | Already well-factored with extracted helper functions (`configureBodyParsing`, `configureSecurity`, `configureGlobalMiddleware`, `configureCors`, etc.). 520 lines with clear separation. |

### Remaining Low-Priority Items

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Document validation strategy in ARCHITECTURE.md | Low | Low |
| 2 | Add internal app to `frontend-critical-e2e.yml` path triggers | Low | Low |
| 3 | Add `enterprise-contracts` repository pattern (currently service-level Prisma) | Medium | Low |
| 4 | Add repository pattern to `reminders` domain (currently service-level Prisma) | Medium | Low |

---

## What NOT to Fix

- **92 controllers without explicit Zod validation** — the global `ZodValidationPipe` + service-level `.parse()` covers this. No defect.
- **57 hooks without `onError`** — React Query defaults + page-level `DataState` handle query errors. Mutation errors are handled at the feature level with `sonner` toast (77 files).
- **`tier.ts` at 1,876 lines** — this is a schema file, not logic. Splitting would fragment the source of truth for billing tiers.
- **Landing images** — already optimized in PR #304.
- **Landing motion** — already compliant with `useReducedMotion()`.
- **Payments domain** — already uses ports/adapters (strategy pattern). No Prisma access.
