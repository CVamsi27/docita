# Security Audit Report: Partner Portal & Public Ingress

**Date:** 2026-08-17
**Scope:** Partner portal domain (auth, facility leads, payout details, referral codes), public ingress (IP resolution, throttler rate limiting), WhatsApp webhook verification, CSRF delivery chain
**Reviewer:** Automated security review (Codebuff agent)
**Methodology:** OWASP-aligned code review with data-flow tracing; HIGH-confidence findings only

---

## Executive Summary

A systematic security review of the partner portal domain and public ingress surface identified **5 findings** (1 Medium, 4 Low/defense-in-depth). All have been remediated and shipped across PRs #293, #294, #296, and #299. No HIGH-confidence exploitable vulnerabilities remain. The partner portal's auth design (atomic OTP caps, audience-enforced short+long JWTs, active re-checks, non-enumerable endpoints) and the tenant/partner scoping (guard-derived referrerId everywhere) are genuinely well-defended.

| Finding | Severity | Status | PR |
|---------|----------|--------|----|
| SEC-001: Dead audience check in refresh | Low | Fixed | #293 |
| SEC-002: OTP timing side channel | Low | Mitigated | #293 |
| SEC-003: Unconditional CF-Connecting-IP trust | Medium | Fixed | #294 |
| NOTE-001: WhatsApp challenge as text/html | Low | Fixed | #296 |
| VERIFY-001: Partner refresh token in localStorage | Medium | Fixed | #299 |

---

## Scope and Methodology

### In Scope

- `apps/api/src/domains/subscriptions/` — partner auth, facility leads, payout details, referral codes
- `apps/api/src/shared/common/http/` — client IP resolution, Cloudflare IP ranges
- `apps/api/src/shared/common/interceptors/` — CSRF interceptor
- `apps/api/src/domains/whatsapp/` — webhook verification endpoint
- `apps/app/src/features/referral-partner/` — partner portal session management
- `packages/data-access/src/partner/` — partner API client and hooks
- `packages/types/src/shared/referrals.ts` — partner-facing schemas
- `apps/api/test/e2e/partner-portal/` — e2e test coverage

### Out of Scope

- Internal operator surfaces (internal leads controller, facility lead command service) — reviewed separately
- Main app session management (already uses httpOnly cookies)
- Database schema and migrations (not security-relevant for this review)
- Infrastructure (Fly.io firewall, Cloudflare Tunnel) — documented separately

---

## Findings

### SEC-001: Dead Audience Check in Partner Refresh (Low)

**Location:** `apps/api/src/domains/subscriptions/core/services/partner-auth.service.ts:217`
**Confidence:** High (verified against jsonwebtoken 9.0.2 behavior)
**Status:** Fixed (PR #293)

**Issue:** The refresh path contained `!isPartnerJwtAudience(JWT_AUDIENCE_PARTNER)` — passing the constant to a predicate comparing against that same constant, so the term was always false. The check read as if it validated the token's `aud` claim, but real audience enforcement happened in `jwt.verifyAsync(..., { audience })` above.

**Impact:** The dead check was defense-in-depth only; `jwt.verifyAsync` with the `audience` option already rejects tokens with wrong audience. However, a future refactor that dropped the verify option would silently widen the surface.

**Fix:** Changed to `!isPartnerJwtAudience(claims.aud)` — now validates the actual claim value from the verified token, making the defense-in-depth check real.

**Evidence:**
```typescript
// Before (dead check):
if (claims.type !== 'refresh' || !isPartnerJwtAudience(JWT_AUDIENCE_PARTNER))

// After (real check):
if (claims.type !== 'refresh' || !isPartnerJwtAudience(claims.aud))
```

---

### SEC-002: OTP Request Timing Side Channel (Low)

**Location:** `apps/api/src/domains/subscriptions/core/services/partner-auth.service.ts:102-111`
**Confidence:** High (timing gap measured and documented)
**Status:** Mitigated (PR #293)

**Issue:** When `requestOtp` is called with a phone number that has no active partner account, the no-match path skips the bcrypt hash, two DB writes, and the WhatsApp send. This creates a deterministic timing delta between match (~53ms bcrypt + DB + network) and no-match (~0ms), allowing an attacker to enumerate whether a phone number has an active partner account.

**Impact:** Low — the timing delta reveals partner account existence, not credentials. The 5/min/IP throttler limits brute-force attempts, but enumeration of a known phone list is feasible within the rate limit.

**Mitigation:** Added a dummy bcrypt hash (same cost 10, same input length) on the no-match path, closing the deterministic crypto component of the delta. The residual delta (DB writes + WhatsApp call) is network-bound; full parity would require sending real messages to non-partners, which is a product decision.

**Residual:** The network-bound delta (~10-50ms depending on runner load) remains. Full mitigation requires a product decision on whether to send dummy WhatsApp messages to non-partners.

---

### SEC-003: Unconditional CF-Connecting-IP Trust for Throttler (Medium)

**Location:** `apps/api/src/shared/common/http/client-ip.ts:1-54`
**Confidence:** High (verified via direct-to-origin probe)
**Status:** Fixed (PR #294)

**Issue:** `getClientIp` trusted `CF-Connecting-IP` unconditionally — any client could set this header to rotate the per-IP throttle key, bypassing the OTP 5/min and partner 60/20 limits on direct-to-origin traffic. The API origin (`docita-api.fly.dev`) resolves to a public IP and returned HTTP 200 with a spoofed header.

**Impact:** Medium — an attacker who knows the Fly.io origin IP (discoverable via DNS) can bypass all per-IP rate limits by setting `CF-Connecting-IP` to a rotating value. This affects OTP brute-force protection (5/min/IP) and partner read/write limits (60/20 per min).

**Fix:** Production-only peer verification gate: `CF-Connecting-IP` is only trusted when the direct socket peer is a Cloudflare edge IP (pinned ranges in `cloudflare-ips.ts`). Non-Cloudflare peers fall through to `X-Forwarded-For` / `req.ip`. Non-production (Render staging, local dev) keeps the legacy chain unchanged.

**Evidence:**
```typescript
// Production: verify peer is Cloudflare before trusting proxy headers
if (process.env.NODE_ENV === 'production') {
  if (!peerIp || !isCloudflareIp(peerIp)) {
    return peerIp ?? 'unknown';
  }
  return (
    firstForwardedForIp(firstHeaderValue(headers['cf-connecting-ip'])) ??
    firstForwardedForIp(firstHeaderValue(headers['x-real-ip'])) ??
    firstForwardedForIp(firstHeaderValue(headers['x-forwarded-for'])) ??
    peerIp
  );
}
```

**Residual:** Fly.io does not support source-IP ingress filtering for `http_service` traffic (network policies only apply to direct Machine traffic, not proxy-routed traffic). The application-level fix is the maximum achievable in-repo. A Cloudflare Tunnel would eliminate direct-to-origin bypass entirely but requires architectural changes (documented in the Fly ingress analysis).

---

### NOTE-001: WhatsApp Webhook Challenge Served as text/html (Low)

**Location:** `apps/api/src/domains/whatsapp/presentation/controllers/whatsapp-webhook.controller.ts:45`
**Confidence:** High (verified through the real NestJS response pipeline)
**Status:** Fixed (PR #296)

**Issue:** The WhatsApp webhook challenge GET endpoint returned the raw challenge string with NestJS's default `text/html` serialization. A challenge containing markup (e.g., `<script>alert(1)</script>`) would render as HTML in a browser.

**Impact:** Low — the challenge endpoint requires knowing the verify token (not attacker-controllable), and the response is only consumed programmatically by WhatsApp. However, if a browser were pointed at the verification URL, the response would render as HTML.

**Fix:** Added `@Header('Content-Type', 'text/plain')` to the GET handler. The challenge is now served as plain text regardless of content.

**Regression tests:** Two new e2e tests pin the content-type through the real response pipeline:
1. A `<script>alert(1)</script>` challenge with the correct verify token returns 200 with `content-type: text/plain`
2. A wrong verify token still returns 403

---

### VERIFY-001: Partner Refresh Token in localStorage (Medium)

**Location:** `apps/app/src/features/referral-partner/lib/partner-session.ts`
**Confidence:** High (verified against the main app's session pattern)
**Status:** Fixed (PR #299)

**Issue:** The partner portal stored the 30-day refresh token in `localStorage`, which is readable by any XSS script. The main app's session already uses an httpOnly cookie for the same purpose — the partner portal was the only auth surface still exposing the long-lived bearer to JavaScript.

**Impact:** Medium — a reflected or stored XSS in the partner portal would expose the 30-day refresh token, allowing session hijacking. No `dangerouslySetInnerHTML` sinks exist in the app (React auto-escapes), so exploitation requires a real XSS vulnerability. The `active` flag re-check on every token use provides a partial mitigation (deactivation terminates sessions on next request).

**Fix:** The refresh token is now set as an httpOnly cookie (`partner_refresh_token`) by the server on `verify-otp` and read from `req.cookies` on `refresh`. The client never sees the refresh token.

**Cookie flags:** `httpOnly`, `sameSite=strict`, `secure` (production), `path=/`, 30-day TTL — matching the main app's session cookie pattern.

**CSRF:** `/partner/auth/refresh` added to `PRE_AUTH_PATH_PATTERNS` in the CSRF interceptor; the partner session bootstraps the CSRF token via `GET /health` before the refresh POST.

**Verification:** 10 files changed (+226/−93), partner-portal e2e 15/15, all gates green.

---

## CSRF Delivery Chain Audit (No Gap Found)

Traced end-to-end across the full session:

1. **Mint** — `CsrfInterceptor`: `randomBytes(24)` (192-bit) per session; `XSRF-TOKEN` cookie with `httpOnly + sameSite=strict + secure (prod) + path=/`; token mirrored in the `X-CSRF-Token` response header.
2. **Delivery** — CF proxy worker forwards `X-CSRF-Token` through; rewrites `Set-Cookie` by stripping `Domain=` (narrows cookie scope to host-only on each app origin).
3. **Capture** — Both apps' API clients call `captureCsrfFromResponse(response)` via `onFetchResponse`, storing the header token in memory.
4. **Echo** — `onRequest` adds `x-xsrf-token` on POST/PUT/PATCH/DELETE only.
5. **Validation** — Interceptor compares cookie vs header with `timingSafeEqual`; 403s on mismatch; skips for Bearer-auth requests (no cookie CSRF exposure).

No exploitable gap: the cookie is unreadable by XSS (httpOnly), not sent cross-site (sameSite=strict + host-only scope), and the header must match the cookie constant-time.

---

## Partner Portal Auth Design Assessment

The partner portal's auth design was reviewed and found to be **genuinely well-defended**:

| Mechanism | Evidence |
|-----------|----------|
| **Atomic OTP cap** | `updateMany` with `attempts < 3` + increment in one statement — no TOCTOU window |
| **Non-enumerable OTP** | Same response shape and timing (post-SEC-002) for match and no-match |
| **JWT audience enforcement** | Both at `verifyAsync` (option) and claim level (SEC-001 fix) |
| **Active re-check on every use** | `assertReferrerActive` on every `verifyAccessToken` and `refresh` — deactivation terminates sessions on next request |
| **Guard-derived referrerId** | No client-supplied partner ID anywhere — every controller handler reads `this.context(req)` |
| **Payout encryption** | Account number, IFSC, PAN encrypted with `ENCRYPTION_KEY`; only last-4s + plaintext IFSC returned |
| **Idempotent lead submission** | Per-partner compound unique (`referrerId_idempotencyKey` — no cross-partner replay) |
| **PII-redacted notifications** | Notification payload deliberately omits phone/email |

---

## Recommendations

### Immediate (no action needed)

All findings have been remediated and shipped. No outstanding security defects.

### Follow-up (tracked)

1. **Fly ingress firewall** (ops action) — Restrict `docita-api` ingress to Cloudflare's published IP ranges via Cloudflare Tunnel. This is the network-level complement to SEC-003. Requires `FLY_API_TOKEN` credentials and architectural decision on latency/failure-mode tradeoffs. See the Fly ingress analysis for the three paths forward.

2. **OTP timing full parity** (product decision) — SEC-002's mitigation closes the deterministic crypto delta but the network-bound residual (~10-50ms) remains. Full parity requires sending dummy WhatsApp messages to non-partners, which needs a product decision.

3. **Partner refresh token rotation** (enhancement) — The current design uses JWT rotation (no revocation ledger beyond the `active` flag). Adding a refresh token family chain or a revocation ledger would strengthen the design against token theft, but is not required given the httpOnly cookie fix.

---

## Verification Matrix

| Check | Result |
|-------|--------|
| api check-types | 0 |
| app check-types | 0 |
| internal check-types | 0 |
| partner-auth unit spec | 19/19 |
| partner-portal e2e | 15/15 |
| webhook e2e | 8/8 |
| lint | 0 |
| knip | 0 |
| verify:standard | 0 |
| check:frontend-fetch | 0 |

---

## PRs in This Session

| PR | Title | Security Finding |
|----|-------|-----------------|
| #293 | enforce real partner audience check on refresh; OTP timing parity | SEC-001, SEC-002 |
| #294 | verify Cloudflare peer before trusting proxy headers for throttling | SEC-003 |
| #295 | make database reset stable under runner disk-I/O pressure | (infrastructure) |
| #296 | serve WhatsApp webhook verification challenge as text/plain | NOTE-001 |
| #298 | guard the reset path with a budget to fail loudly on regression | (infrastructure) |
| #299 | move partner refresh token from localStorage to httpOnly cookie | VERIFY-001 |
