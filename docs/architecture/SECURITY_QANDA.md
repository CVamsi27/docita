# Security Q&A

## Authentication & Session Management

**Q: How are user sessions managed?**

**A:** Sessions use a dual-token pattern. An **access token** (JWT, 15-min TTL) is the short-lived credential. A **refresh token** (30-day TTL, httpOnly cookie only) is used to get new access tokens. Both are delivered as httpOnly, Secure, SameSite=Strict cookies — never in `localStorage` or response bodies. The refresh token path is restricted to `/api/v1/auth`.

**Q: How is refresh token rotation handled?**

**A:** Every refresh rotates the token: the old one is revoked and a new one issued, with `replacedByToken` set to `SHA-256(newToken)`. If a stolen old token is reused after rotation, the entire **token family** is revoked — all sessions for that user are invalidated. A race-condition guard revokes the family if `updateMany` count isn't exactly 1. Refresh tokens are looked up by `tokenHash` (SHA-256) first, then by raw token for legacy compatibility.

**Q: Where are access tokens stored in the browser?**

**A:** Only in httpOnly cookies and an in-memory closure variable. The `browserSessionManager` explicitly removes any legacy `docita_token` from `localStorage` on init. No access token is ever persisted to `localStorage` or `sessionStorage`. The in-memory token is only used for WebSocket auth and cross-origin monitoring beacons.

**Q: How are passwords stored?**

**A:** Hashed with **bcrypt**. After 5 failed login attempts the account is locked for 15 minutes. Passwords expire after 90 days, enforced by `PasswordExpiredGuard` in the global guard chain.

**Q: How are API keys handled?**

**A:** The frontend never attaches `Authorization: Bearer` in normal API calls. All requests use `credentials: "include"` to send httpOnly cookies automatically. The only exception is the public booking flow which uses a short-lived bearer token. The API client at `@workspace/data-access` explicitly skips Bearer headers for same-origin requests.

---

## CSRF Protection

**Q: How is CSRF prevented?**

**A:** Double-submit cookie pattern. The `CsrfInterceptor` sets an httpOnly `XSRF-TOKEN` cookie with `SameSite=Strict` and mirrors it on a CORS-exposed `X-CSRF-Token` response header. On mutating requests, the JS client reads the cookie and sends it as `X-XSRF-TOKEN` header. The interceptor compares both values using `crypto.timingSafeEqual`. Bearer-authenticated requests and pre-auth endpoints (`/auth/login`, etc.) skip CSRF. The frontend has auto-retry: on `INVALID_CSRF_TOKEN` (403), it re-fetches the token and retries once.

**Q: Which endpoints bypass CSRF?**

**A:** Pre-auth endpoints (login, register, password reset) bootstrap CSRF tokens unconditionally. Public booking and web-vitals endpoints are exempted because they're accessed cross-site. Bearer-authenticated requests skip CSRF since Bearer tokens are inherently immune to CSRF.

---

## XSS Prevention

**Q: How is stored XSS prevented?**

**A:** Three layers:

1. **Input sanitization** — user-facing string fields in Zod schemas use `stripHtmlTags()` as a `.transform()`. The function first decodes HTML entities (via `he.decode()` — covers all HTML4/HTML5 named entities, numeric and hex character references), then strips all remaining `<...>` tags. This prevents encoded attacks like `&lt;script&gt;` from bypassing the filter.
2. **CSP with `strict-dynamic`** — production apps use nonce-based `script-src` with `'strict-dynamic'`, dropping `'unsafe-inline'`. All apps have CSP via `helmet()` (API) or `security-headers.ts` (Next.js, Astro).
3. **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Q: What is `stripHtmlTags` and why use `he` instead of regex?**

**A:** `stripHtmlTags` removes HTML from user-input fields. It's used as a Zod `.transform()` on hundreds of fields across patient names, clinic names, addresses, notes, etc. The old regex `/<[^>]*>?/gm` would miss encoded entities (`&lt;script&gt;`), malformed nested tags (`<<script>script>`), and character references (`&#60;script&#62;`). The new implementation first runs `he.decode(unsafe)` which converts all HTML entities to their actual characters, then strips the resulting `<...>` tags. This is the same approach DOMPurify uses internally.

**Q: Is there any `dangerouslySetInnerHTML` usage?**

**A:** No. React's built-in JSX escaping covers all output. No raw HTML injection patterns were found in the codebase.

**Q: Are there any XSS vectors that aren't covered?**

**A:** The `stripHtmlTags` function is designed for plain-text fields. If a feature ever needs to accept and render safe HTML (e.g., rich-text notes), a proper DOM-based sanitizer like DOMPurify should be added. Currently no feature requires HTML rendering from user input.

---

## HTTP Security Headers

**Q: What security headers are set across the stack?**

**A:**

| Header | API | Next.js App | Internal | Landing |
|---|---|---|---|---|
| CSP | `default-src 'self'`, `script-src 'self'` | Nonce + `strict-dynamic` | Nonce + `strict-dynamic` | Standard CSP |
| HSTS | `max-age=31536000; includeSubDomains; preload` | Same | Same | Same |
| X-Content-Type-Options | `nosniff` | `nosniff` | `nosniff` | `nosniff` |
| X-Frame-Options | – | `DENY` | `DENY` | `DENY` |
| X-XSS-Protection | `1; mode=block` | – | – | – |
| Referrer-Policy | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` | – |
| Permissions-Policy | – | `camera=(), microphone=(), geolocation=(self), payment=(self)` | Same | – |
| Cross-Origin-Opener-Policy | – | `same-origin` | `same-origin` | – |
| Cross-Origin-Resource-Policy | `cross-origin` (intentional for uploads) | `same-origin` | `same-origin` | – |

Headers are verified at deploy time by `scripts/deploy/verify-app-security-headers.mjs`.

---

## Rate Limiting

**Q: What rate limiting layers exist?**

**A:** Five layers:

1. **IP-level** — login/registration endpoints (`IpRateLimitGuard`)
2. **User-level** — 120 req/min default, route-specific overrides (consultation PATCH gets 600/min, typeahead search 300/min)
3. **Tenant-level** — per-clinic quota: burst (1s window), sustained (60s window), monthly budget (5M default). Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
4. **Global throttler** — NestJS `@nestjs/throttler` as outermost guard
5. **Account lockout** — 5 failed login attempts → 15 min lockout

WebSocket connections also have per-client rate limiting in both the payment and notification gateways.

**Q: How does tenant-level rate limiting work?**

**A:** `TenantRateLimitGuard` tracks per-clinic request counts using in-memory counters that flush to the database periodically. Each clinic has a monthly budget (5M requests default), a burst limit (50 RPS default), and a sustained limit (5000 RPM default). Quotas are configurable via env vars and the `clinicApiQuota` table.

---

## Tenant Isolation

**Q: How is data isolated between clinics?**

**A:** Two-layer approach. **Layer 1 (application-level):** every repository method includes `clinicId` in `where` clauses. Controllers extract clinic context from the JWT payload via `getClinicStaffRequestContext()`. **Layer 2 (PostgreSQL RLS):** scaffolded but gated behind `RLS_ENABLED` (defaults to `false`). When enabled, `TenantContextInterceptor` opens a transaction per-request, sets `SET LOCAL app.tenant_id` via `applyRlsScope()`, and routes all Prisma calls through that connection. RLS bypasses are explicitly annotated with `// RLS-BYPASS:` comments and enforced by CI.

**Q: What operations bypass RLS?**

**A:** Auth flows (users resolved before clinic context exists), rate limiting (checks happen before clinic context), audit logging (cross-tenant compliance), queue workers (background jobs), feature flags (global config), schedulers (system-wide operations), and onboarding (creates clinic before membership exists). All bypasses are annotated and checked by `scripts/checks/check-rls-bypass-annotation.mjs`.

---

## File Upload Security

**Q: How are file uploads secured against malicious content?**

**A:** Three layers of validation:

1. **MIME type check** — the `FileInterceptor` `fileFilter` callback only allows `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
2. **Magic byte signature check** — `assertAllowedFileSignature()` reads the first 12 bytes of the file and validates them against known signatures (PDF: `25504446`, PNG: `89504E47`, JPEG: `FFD8FF`, WebP: `52494646...57454250`). This prevents MIME-type spoofing.
3. **Extension-MIME match** — if the original filename is available, the validator checks that the file extension matches the declared MIME type (e.g., `.jpg`/`.jpeg` → `image/jpeg`, `.pdf` → `application/pdf`).

Path traversal is blocked at multiple levels: folder names are restricted to `[a-zA-Z0-9/_-]`, `..` is rejected in storage keys, and `resolveSafeUploadPath()` double-checks the resolved path stays under the upload root.

**Q: What happens to image files?**

**A:** Image files are processed through `sharp` — resized to 2000×2000 max, rotated, auto-oriented, and re-encoded. This strips EXIF metadata (GPS location, camera model, etc.) and prevents image-based attacks.

**Q: What about file sizes?**

**A:** The `FileInterceptor` enforces `fileSize: MAX_FILE_SIZE (10 MB)`. The bulk import endpoint has a separate 50 MB limit.

**Q: How are filenames sanitized?**

**A:** Stored filenames use `nanoid()` + the validated extension — the original filename is never used for storage. Temp files are cleaned up in `finally` blocks on both success and error paths.

---

## Signed URLs & R2 Access

**Q: How are R2 storage URLs generated and secured?**

**A:** R2 URLs are presigned S3 URLs generated via `@aws-sdk/s3-request-presigner` with short TTLs: 15 minutes for clinical PDFs (invoices, prescriptions), 4 hours for generic uploads. The database stores only the bare object key (`pdfs/invoices/{id}.pdf`), never the full signed URL. URLs are generated on-the-fly at serve-time.

**Q: How is access restricted to R2 files?**

**A:** Four layers:

1. **API auth guards** — every endpoint that returns a file URL enforces auth/tier/role/feature gating (TierGuard, @Roles, @RequireFeature, audit logging) before generating the signed URL.
2. **Upload session secrets** — the QR/mobile upload path uses a one-time 43-char random secret, SHA-256 hashed, timing-safe compare, 15-min expiry, single-use only.
3. **Signed URL TTL** — short lifetimes limit the exposure window if a URL leaks. R2 rejects expired URLs with 403.
4. **Frontend URL validation** — before the browser navigates to a signed URL, `safeOpenSignedUrl()` validates: URL prefix (https or same-origin only), required query parameters (`X-Amz-Signature`, `X-Amz-Algorithm`, `X-Amz-Credential`), and expiry date. Invalid or expired URLs are blocked client-side.

**Q: Are signed URLs bound to a specific user?**

**A:** No — they're bearer tokens. The security model relies on (a) API guards preventing unauthorized users from reaching the URL-generating endpoint, (b) short TTLs, and (c) frontend validation. For public patient-facing routes (prescriptions, invoices), the document ID is protected by an HMAC-SHA256 token (`sign(type, id) → base64url(type:id).base64url(hmac)`) that is verified server-side on every request. The public routes proxy the file through the API instead of redirecting to R2, eliminating bearer-token URLs from the response entirely.

---

## Public Document Routes

**Q: How are public patient document routes secured?**

**A:** Three hardening steps:

1. **HMAC-signed tokens** — instead of bare cuid in URLs (`/public/patient/rx/{cuid}/pdf`), each URL carries `base64url(type:id).base64url(HMAC-SHA256)` signed with `PUBLIC_DOCUMENT_SIGNING_SECRET`. `PublicDocumentTokenService.verify()` uses `timingSafeEqual`. A prescription token cannot access an invoice. Tampered tokens return 400.
2. **Server-side proxy** — the public controller no longer redirects to R2 signed URLs. `StorageProvider.getObject()` fetches the raw buffer via `GetObjectCommand` and streams it through the API response. Every request goes through per-request HMAC validation.
3. **Access logging** — every access emits a structured `PUBLIC_DOCUMENT_ACCESS` log entry with `type`, `documentId`, `clinicId`, `ipAddress`, `userAgent`, `success`, and `timestamp` for anomalous pattern detection.

**Q: What token format is used?**

**A:** `base64url(type + ":" + id) + "." + base64url(HMAC-SHA256(type + ":" + id, secret))`. The type field prevents cross-type substitution attacks. The secret is `PUBLIC_DOCUMENT_SIGNING_SECRET` from env, with a minimum 32-character requirement enforced by Zod.

---

## Audit Logging

**Q: What security events are audited?**

**A:** Login attempts (including failed), PHI access (VIEW_HISTORY, VIEW_PROFILE, EXPORT_DATA), prescription/appointment/payment/admin CRUD, data exports, public document access, and admin actions. Each audit entry records: `clinicId`, `userId`, `actionType`, `resourceType`, `resourceId`, `ipAddress`, `userAgent`, `changes`, `metadata`, and `timestamp`.

**Q: Who can query audit logs?**

**A:** Only `INTERNAL` and `ADMIN` roles. Queries are restricted by role in the `AuditService.getAuditLogs()` method.

**Q: How is audit logging enforced for GET endpoints?**

**A:** A CI script (`scripts/checks/check-phi-read-audit.mjs`) scans all `@Get()` controller methods and verifies they call one of the audit functions. Fails the build if a GET controller touching PHI is missing the audit call.

**Q: How does the audit system handle RLS?**

**A:** Audit writes bypass RLS (`runUnrestricted` + `runOutsideActiveTx`) because compliance logging must persist across tenant boundaries. The bypass is explicitly documented with `// RLS-BYPASS:` annotations.

---

## PHI Protection

**Q: How is PHI protected in logs and monitoring?**

**A:** The `PhiRedactor` recursively redacts 53+ field names (email, phone, DOB, Aadhaar, PAN, SSN, medical notes, password, tokens, API keys) from logs and Sentry payloads. It also detects Indian phone numbers, Aadhaar, PAN, and email via value-pattern matching. Pino has 27 redact paths for fast known-path scrubbing. Sentry captures exclude raw request bodies. Error stack traces are only returned in development mode.

**Q: What fields are redacted?**

**A:** Full list in `phi-redactor.ts` `PHI_FIELD_NAMES`: `password`, `email`, `phone`, `phoneNumber`, `firstName`, `lastName`, `dob`, `dateOfBirth`, `aadhaar`, `pan`, `address`, `mrn`, `medicalRecordNumber`, `ssn`, `nationalId`, `signatureUrl`, `notes`, `medicalNotes`, `diagnosis`, `symptoms`, `medications`, `ssn`, `token`, `accessToken`, `refreshToken`, `secret`, `apiKey`, `authorization`, plus 40+ more.

**Q: Is data encrypted at rest?**

**A:** Yes. Sensitive patient fields use AES-256-GCM encryption via `EncryptionService`. Format: `version:IV:authTag:ciphertext`. Key rotation is supported through `ENCRYPTION_KEY_V2` through `ENCRYPTION_KEY_V5` environment variables.

---

## Input Validation

**Q: How is input validated across the stack?**

**A:** Zod schemas in `packages/types` are the single source of truth. The API uses a global `ZodValidationPipe` that validates all request bodies. Every DTO uses `createZodDto()`. Environment variables are validated at startup via `EnvSchema.safeParse()` — the process exits with code 1 if config is invalid.

**Q: Is there frontend env validation?**

**A:** Yes — `apps/app/shared/lib/config/env-schema.ts` and `apps/internal/shared/lib/config/env-schema.ts` use Zod to validate `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL` (required), plus optional vars. Fails hard on the server side, gracefully degrades in the browser.

---

## Authentication Guard Chain

**Q: What guards execute on every request?**

**A:** Ten guards in order:
1. `E2EThrottlerGuard`
2. `JwtAuthGuard`
3. `StaffJwtAudienceGuard` (ensures patient-portal tokens can't access staff routes)
4. `TenantGuard`
5. `TenantRateLimitGuard`
6. `RolesGuard`
7. `SubscriptionStatusGuard`
8. `PasswordExpiredGuard`
9. `EmailVerifiedGuard`
10. `UserRateLimitGuard`

Plus interceptors: `CsrfInterceptor`, `RequestIdInterceptor`, `TenantContextInterceptor`, `PatientDataAuditInterceptor`.

**Q: How does the `@Public()` decorator work?**

**A:** It sets `IS_PUBLIC_KEY = true` metadata. The global `JwtAuthGuard` checks this metadata and skips JWT validation for these routes. Applied to: login, register, password reset, MFA verify, webhooks, health, public booking, public documents, and feature flags.

**Q: How are webhook endpoints secured?**

**A:** Webhooks are `@Public()` (no JWT) but verified by shared secrets: Razorpay against `RAZORPAY_WEBHOOK_SECRET`, WhatsApp against `META_VERIFY_TOKEN`. Cloudflare Turnstile CAPTCHA protects public booking endpoints.

---

## SQL Injection & Database

**Q: How is SQL injection prevented?**

**A:** Prisma ORM generates parameterized SQL by default. The few `$queryRaw` usages (in analytics, search, observability) use Prisma's template literal syntax which parameterizes inputs. No string concatenation in SQL was found in request handlers. The `check:prisma-boundary` CI script enforces `@prisma/client` stays within `packages/db` and API repository layers.

**Q: Are there any raw queries in request paths?**

**A:** The analytics factory, search strategies, and certain admin queries use `$queryRaw` with template literals. These are all parameterized. Unparameterized `$queryRawUnsafe` is only used in database scripts (migrations, backfills), never in request paths.

---

## Dependency Security

**Q: How are third-party dependencies secured?**

**A:** CI runs `pnpm audit --audit-level=high` and Google's `osv-scanner-action` on PRs that touch dependency manifests. The OSV scanner runs PR-only and fails on new vulnerabilities only. Pre-existing advisories are reported but don't block. Circular imports are checked by `check-circular-deps.mjs` (baseline: 0 cycles). Unused exports and dependencies are checked by `pnpm knip`.

---

## Error Handling

**Q: Do errors leak sensitive information in production?**

**A:** No. The global exception filter (`http-exception.filter.ts`) strips stack traces in production: `stack: this.configService?.isDevelopment() ? errorStack : undefined`. Prisma errors are mapped to user-safe messages via `mapPrismaKnownRequestError`. 401s and 403s are logged as warnings without stack traces. 500+ errors go to Sentry with PHI redaction and a redacted summary. Catch-all unknown errors return the Error `.message` safely (domain errors have safe messages).

**Q: What format do error responses use?**

**A:** Problem Details format (`about:blank`) with `title`, `status`, `detail`, `instance`, and `timestamp`. Validation errors return field-level details in `validationErrors`.

---

## CORS

**Q: How is CORS configured?**

**A:** In staging and production, CORS origins are locked to `https://*.docita.work` enforced at boot by `assertDocitaOnlyPublicOrigins()`. Credentials are enabled, `X-CSRF-Token` header is exposed, and preflight cache is 24 hours. In development, localhost origins are allowed.

---

## Environment Variables

**Q: How are secrets loaded and validated?**

**A:** Env files are loaded via `dotenv` (`.env` from current dir and `../../.env` for monorepo root). All env vars are validated against `EnvSchema` (Zod) at startup — the process exits with code 1 on invalid config. `JWT_SECRET` requires minimum 32 characters, `ENCRYPTION_KEY` must be 64 hex characters. Supports `AWS Secrets Manager` via `SECRETS_PROVIDER=aws`. Historical encryption keys (`ENCRYPTION_KEY_V2`–`V5`) are supported for key rotation.

**Q: What env vars are considered critical?**

**A:** `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `ENCRYPTION_KEY` (64-char hex), `NEXT_PUBLIC_API_URL`. These are documented in `AGENTS.md` §6.

---

## Infrastructure & Operations

**Q: How are deployment secrets managed?**

**A:** The CI deploy workflows use GitHub Actions secrets for sensitive values. Production env vars are set in the Fly.io dashboard (API, worker) and Cloudflare dashboard (frontend). `.env.production` files exist with public-only values (Sentry DSN, Razorpay key ID). No backend secrets (`DATABASE_URL`, `JWT_SECRET`, etc.) appear in frontend code or `.env` files.

**Q: How is the deployment verified?**

**A:** Scripts in `scripts/deploy/` verify security headers (`verify-app-security-headers.mjs`), startup health, and header configuration at deploy time.

**Q: What CI checks enforce security posture?**

**A:** `pnpm verify:standard` runs: Prisma boundary checks, RBAC checks, tier comparison checks, workspace profile gating, frontend fetch blocking, PHI read audit coverage, circular import detection, file size budgets, and RLS rollout readiness. Each check is in `scripts/checks/`.
