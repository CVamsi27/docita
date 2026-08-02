# Security Analysis — Auth, Guards, PHI, Secrets, Advisories

Point-in-time: **2026-08-02**. Sources: `apps/api/src/shared/modules/auth/` (30+ files), `docs/compliance/AUTH_HARDENING.md`, `docs/compliance/ACCESS_AUDIT.md`, `docs/compliance/SECURITY_ALLOWLIST.md`, `pnpm audit`.

## % Completed

| Area | % | Notes |
|---|---|---|
| Raw `<button>` compliance | **100%** | 0 violations in production code |
| Inline `fetch()` compliance | **~0%** | 1 violation remains (`use-download-opd-slip.ts:20`); `check:frontend-fetch` is git-based and misses untracked `apps/app-vite/src` |
| Aria-label compliance | **28%** | 108/150 still missing (re-verified 2026-08-02) |
| Error boundary coverage | **100%** | 5/5 functional layouts covered |
| Auth architecture | **100%** | 10-guard pipeline, CSRF, MFA, lockout — all live |
| PHI encryption | **100%** | AES-256-GCM on 13 patient fields |

## 1. Auth architecture — strong overall

| Layer | Mechanism | Notes |
|---|---|---|
| Access token | JWT, `JWT_SECRET` (boot-fail if <32 chars), **15-min TTL**, 5 audiences (staff, patient-portal, lab-portal, public-booking, partner) | Bearer header preferred; httpOnly `access_token` cookie fallback |
| Refresh token | nanoid(64), **30-day TTL**, **SHA-256 hashed** in `RefreshToken`, rotation lineage (`tokenFamily`, `replacedByToken`) with family-wide revocation on reuse | retried transaction; per-session rows (deviceName, ip, UA) |
| Cookies | both httpOnly; refresh cookie path-scoped to `/api/v1/auth`; `sameSite=strict`, `secure` in prod; raw refresh token stripped from response bodies | — |
| CSRF | **double-submit**: `XSRF-TOKEN` httpOnly cookie → `X-CSRF-Token` header, `timingSafeEqual` compare | Bearer-header + pre-auth endpoints exempt; refresh/logout/change-password strict |
| MFA | TOTP (`otplib`, tolerance 1) via `MfaChallenge` (5-min TTL) + 10 hashed one-time backup codes | WebAuthn NOT implemented (hardening item 5) |
| Lockout | **5 failed attempts → 15-min lock** (`accountLockedUntil`), auto-reset, Sentry + metric | — |
| API keys | `dct_` prefix, 32-byte nanoid, only SHA-256 `keyHash` + prefix stored; scopes, allowed IPs, expiry, rotation with overlap | `ApiKeyGuard` + `@ApiKeyScope` |

**Global guard pipeline** (app.module.ts:183-228): E2EThrottler → JwtAuth → StaffJwtAudience → Tenant → TenantRateLimit → Roles → SubscriptionStatus → PasswordExpired → EmailVerified → UserRateLimit. Interceptors: CSRF, request-id, tenant-context, cache, rate-limit, timeout, patient-PHI-write-audit, break-the-glass.

Guard pipeline registration order (verified from app.module.ts):

| Order | Guard | Scope | Purpose |
|---|---|---|---|
| 1 | `E2EThrottlerGuard` | Global | Rate limiting (E2E bypass in test mode) |
| 2 | `JwtAuthGuard` | Global | JWT verification + user hydration |
| 3 | `TenantGuard` | Global | Clinic isolation via `clinicId` from JWT |
| 4 | `TenantRateLimitGuard` | Global | Per-clinic rate limiting |
| 5 | `RolesGuard` | Global | RBAC from `@Roles()` decorator |
| 6 | `SubscriptionStatusGuard` | Global | Active subscription check |
| 7 | `PasswordExpiredGuard` | Global | Forces password change if expired |
| 8 | `EmailVerifiedGuard` | Global | Blocks unverified accounts |
| 9 | `UserRateLimitGuard` | Global | Per-user rate limiting |

Decorators that skip guards: `@Public()` (bypasses JWT), `@SkipSubscriptionCheck`, `@SkipPasswordExpiry`, `@SkipEmailVerification`, `@EmergencyAccess`, `@RequirePatientConsent`.

## 2. RBAC posture

- `@Roles(` **145 usages across 74 of 132 controllers (56%)**; `@Public()` 58 total usages. `@ClinicScoped` **0 usage sites** — decorator + guard are defined and DI-registered (`common-services.module.ts`) but never applied (trash inventory).
- Default-deny doctrine + high-risk traceability matrix (WhatsApp, medical coding, billing, invoices, patients, clinic settings, internal ops) with automated 403 e2e suites (ACCESS_AUDIT.md).
- `check:controller-rbac` requires every route to declare posture — enforced in `verify:standard`.

**RBAC role distribution** (top 10 patterns):

| Pattern | Count | Typical usage |
|---|---|---|
| `@Roles(ADMIN, ADMIN_DOCTOR)` | 33 | Most admin/settings routes |
| `@Roles(INTERNAL)` | 13 | Internal ops endpoints |
| `@Roles(DOCTOR, ADMIN, ADMIN_DOCTOR)` | 8 | Clinical write routes |
| `@Roles(ADMIN, RECEPTIONIST, ADMIN_DOCTOR)` | 7 | Front desk routes |
| `@Roles(ADMIN, ADMIN_DOCTOR, INTERNAL)` | 7 | Cross-role admin |
| `@Roles(ADMIN, ADMIN_DOCTOR, DOCTOR)` | 7 | Clinical read routes |
| `@Roles(PATIENT)` | 4 | Patient portal routes |
| `@Roles(DOCTOR, ADMIN, RECEPTIONIST, ADMIN_DOCTOR)` | 4 | Multi-role clinical |
| Dynamic `getDbRolesForTarget(...)` | ~15 | API-scoped access targets |
| Custom composite decorators | 27 | Compound guard+role bundles |

**Custom composite decorators** (27 controllers): `@AppointmentsApiAccess`, `@DoctorsApiAccess`, `@LegacyWhatsappClinicAccess`, `@InternalApiAccess`, `@PatientPortalApiAccess`, `@LabPortalApiAccess`, `@PublicBookingApiAccess`, `@BillingApiAccess`, etc. Each bundles `UseGuards` + `Roles` at minimum.

## 2.5 API Surface — measured 2026-08-02

| Metric | Count |
|---|---|
| Total controllers (domains + shared) | 132 (91 domain + 41 shared) |
| Total route handler methods (`@Get/@Post/@Put/@Patch/@Delete`) | 639 |
| Controllers with zero route handlers | 0 |
| Controllers with zero guard posture | 0 (all protected) |
| Controllers using custom composite decorators | 27 (e.g. `@AppointmentsApiAccess`, `@DoctorsApiAccess`, `@LegacyWhatsappClinicAccess`, `@InternalApiAccess`) |
| Total `@Public()` controllers | 20 (all intentional: webhooks, health, onboarding, portal auth, public booking) |
| Total `@Roles` controllers | 74 (56% of 132) |
| Controllers without explicit auth decorator | 32 (protected by global 9-guard pipeline) |
| Controllers >200 lines | **10** (largest: ai.controller 247, join-requests 243, invoices 239, appointments-schedule 229) |
| Services >400 lines | **3** (database-control 474, database-rds 469, base-pdf 421) |
| API avg test-to-src ratio | **25%** (analytics 45%, patient-portal 35%, appointments 33%) |
| Security gaps (unprotected routes) | 0 — confirmed: global 9-guard pipeline covers every route |

Custom composite decorators (27 controllers) all include `UseGuards` + `Roles` at minimum; each was verified.

### API complexity hotspots (controllers >200 lines)

| Controller | Lines | Concern |
|---|---|---|
| `ai.controller.ts` | 247 | AI assistant endpoints |
| `join-requests.controller.ts` | 243 | Clinic join/approval flow |
| `invoices.controller.ts` | 239 | Invoice CRUD + payments |
| `appointments-schedule.controller.ts` | 229 | Schedule management |
| `monitoring.controller.ts` | 217 | System health endpoints |
| `doctor-availability.controller.ts` | 215 | Availability slots |
| `patient-portal.controller.ts` | 207 | Portal auth + history |
| `lab-tests.controller.ts` | 206 | Lab ordering + results |
| `prescription.controller.ts` | 201 | Prescription management |
| `clinic-settings.controller.ts` | 201 | Settings CRUD |

### Services >400 lines

| Service | Lines | Concern |
|---|---|---|
| `database-control.service.ts` | 474 | Internal DB operations |
| `database-rds.service.ts` | 469 | RDS lifecycle management |
| `base-pdf.service.ts` | 421 | PDF generation template |

## 3. PHI protection

- **Field-level encryption: AES-256-GCM** (16-byte IV, versioned keys v1–v5, `version:iv:authTag:ciphertext`), via Prisma extension on **`Patient` only** — 13 fields (name, contact, address, insurance, allergies, abhaAddress). Clinical notes/prescriptions/labs rely on DB-at-rest + RLS, not app-layer encryption — accepted posture, revisit for enterprise.
- Audit: `AuditAction` enum (**40 values**, `audit.interface.ts`), `AuditService`/`AuditLoggerService` module (6 files) + `@Audit` decorator; invoked from 12 files across clinics/webhooks/whatsapp/compliance/monitoring; redaction blocklist of 34 PHI field names applied to JSONB old/new values; 200-row read cap.

**Audit actions** (40 values):

| Category | Actions |
|---|---|
| Auth | `USER_LOGIN`, `USER_LOGOUT`, `USER_PASSWORD_CHANGED` |
| User lifecycle | `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `ROLE_CHANGED`, `PERMISSION_CHANGED` |
| Patient | `PATIENT_CREATED`, `PATIENT_UPDATED`, `PATIENT_DELETED`, `PATIENT_EXPORTED` |
| Clinical | `CONSULTATION_CREATED`, `CONSULTATION_UPDATED`, `PRESCRIPTION_CREATED`, `PRESCRIPTION_UPDATED`, `PRESCRIPTION_DELETED` |
| Appointments | `APPOINTMENT_CREATED`, `APPOINTMENT_UPDATED`, `APPOINTMENT_CANCELLED` |
| Billing | `INVOICE_CREATED`, `INVOICE_UPDATED`, `INVOICE_PAID`, `REFUND_ISSUED` |
| Subscription | `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPGRADED`, `SUBSCRIPTION_DOWNGRADED`, `SUBSCRIPTION_CANCELLED` |
| Clinic | `CLINIC_CREATED`, `CLINIC_UPDATED`, `CLINIC_SETTINGS_CHANGED` |
| Security | `EMERGENCY_ACCESS_GRANTED`, `EMERGENCY_ACCESS_REVOKED`, `SECURITY_POLICY_CHANGED`, `SYSTEM_SETTING_CHANGED` |
| API keys | `API_KEY_CREATED`, `API_KEY_ROTATED`, `API_KEY_DELETED` |
| Data ops | `DATA_EXPORT`, `DATA_IMPORT`, `BACKUP_CREATED` |
- PHI logging banned: `check-sensitive-logging`, `check-phi-read-audit`, `check-no-console-runtime` (caught a real `console.error` 2026-07-31).
- Telemetry: Sentry scrubbing (`scrubSentryEventRecord`), same-origin-only posting (`check-browser-telemetry-same-origin`).
- DPDP: consent management (`Consent`/`ConsentTemplate` models, DPDP notice in onboarding), data-retention scheduler (global windows — per-tenant is a gap, see DATABASE_ANALYSIS).

## 4.5 Frontend Contract Violations (measured 2026-08-02)

### Inline `fetch()` — 2 violations (§15.2 rule)

| File | Line | Justified? |
|---|---|---|
| `apps/app-vite/src/features/appointments/hooks/use-download-opd-slip.ts` | 17 | Partially — binary PDF blob download (React Query can't handle blob responses); uses `getAuthHeaders()` |
| `apps/app-vite/src/features/medical-documents/components/use-medical-document-list.ts` | 52 | **No** — raw `fetch("/api/upload")` without auth headers |

### Raw `<button>` — 0 in production code (§4.3 rule)

All 50 raw `<button>` instances are in **test files only** (`.test.tsx`), where native HTML elements are acceptable for test mocks. No production code uses raw `<button>` — the `Button` primitive from `@workspace/ui` is used consistently.

### Missing `aria-label` — 150 instances (§4.3 rule)

| Category | Count | Priority |
|---|---|---|
| `<Link>` tags missing aria-label | 83 | P1 — keyboard navigation |
| `<button>` tags missing aria-label | 37 | P0 — screen readers |
| `<a>` tags missing aria-label | 30 | P1 — external links |

## 5. Secrets hygiene

- **Tracked files — one live credential**: `apps/app-vite/wrangler.toml:25` `VITE_RAZORPAY_KEY_ID = "rzp_live_SPNm7w8Ig24OSX"` (key ID only — cannot charge without the secret, but identifies the live account; REPO_GAPS §H item 8: move to CF secrets). The second occurrence (deploy.yml) was deleted 2026-08-01.
- Sentry DSNs committed in both wrangler files — client-public by design, low risk.
- Workflows: all secrets via `${{ secrets.* }}`; no `sk_live_`/`AKIA` in tracked files (scanned 2026-08-01).
- Gitignored local files with real secrets (`.env.production` ×2, `.env.git`) — confirmed ignored, never in history.
- `SECURITY_ALLOWLIST.md` — **empty** (no approved vulnerability allowlist) ✓.

## 5. Dependency advisories — 3 high, all actionable

`pnpm audit --audit-level=high` (2026-08-01):

| Severity | Package | Issue | Fix |
|---|---|---|---|
| high | react-router (prod, app-vite 7.18.2) | RSC-mode CSRF bypass (GHSA-qwww-vcr4-c8h2) | **8.3.0+** (major — verify v7→v8 compat for 96-route tree) |
| high | playwright 1.48.2 (dev) | browser downloads without SSL cert verification (GHSA-7mvr-c777-76hp) | **1.55.1+** |
| high | brace-expansion (dev toolchain) | DoS OOM (GHSA-mh99-v99m-4gvg) | bump owning tool |

Also: ~~`pnpm.auditConfig.ignoreGhsas` has **4 stale entries** (esbuild ×2 — one withdrawn, lockfile 0.28.1 patched; postcss 8.5.23 patched; valibot 1.4.2 patched) — remove and re-audit.~~ **Removed 2026-08-01** — all 4 stale entries + junk `ignoreCves` cleared.

## 6. Hardening backlog (AUTH_HARDENING.md open items)

1. PDF signed-URL bearer cap (item 3).
2. WebAuthn/passkeys (item 5).
3. Automated KEK rotation (item 8).
4. Webhook secret overlap (item 9).
5. React-router v8 upgrade (advisory above).
6. RLS operator step: run API as `docita_app` non-owner role (RLS_ROLLOUT Step 2).
7. Move the live Razorpay key ID out of `wrangler.toml` into CF secrets.

**Overall posture**: strong for a clinic SMB product — defense-in-depth auth (JWT+refresh rotation+CSRF+MFA+lockout), default-deny RBAC, PHI-encrypted patient PII, audit + redaction, RLS. The material open items are the react-router upgrade, the RLS role switch, and per-tenant retention.
