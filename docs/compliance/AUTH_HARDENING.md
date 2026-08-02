# Authentication & crypto hardening — open items

> **Status**: roadmap. Tracking the unresolved items from
> SYSTEM_DESIGN_AND_PATTERNS.md §28.1.

## Item 3 — PDF signed URL bearer cap

**Today**: short-TTL signed R2 URLs are returned to authenticated
clients. The URL is not bound to a session — anyone who obtains it can
fetch the PDF until the TTL expires.

**Hardening**:

1. Generate signed URLs with a session-bound HMAC checksum embedded as
   a query parameter (`?sig=<hmac(sessionId + url + nonce)>`).
2. A Cloudflare-side Worker (or Next API proxy) verifies the HMAC
   against the active session before forwarding to R2.
3. URLs without a matching session return 401, even within TTL.

`scripts/checks/check-pdf-bearer-cap.mjs` flags controllers that return
signed URLs without an obvious requester binding.

## Item 4 — Drop unhashed refresh tokens — ✅ DONE (2026-05-30)

**Was**: the auth controllers also echoed the raw refresh token in the JSON
response body (in addition to the httpOnly cookie). A leak of a recent response
payload/log would expose a 30-day credential.

**Now**: the raw refresh token is delivered **only** via the httpOnly
`refresh_token` cookie. `stripRefreshTokenFromBody()`
(`auth-cookie.helpers.ts`) removes it from every auth response body — login,
MFA-verify, register, refresh, and patient-portal OTP-verify. The browser
session manager already refreshes via the cookie (empty body +
`credentials: "include"`), and no client read the body field, so this is
transparent to callers. Error paths return an exception envelope with no token.

Rotation lineage (hardening item 3) is already provided by the `RefreshToken`
table's `tokenFamily` + `replacedByToken` (reuse detection revokes the family),
so the doc's hypothetical `Session.replacedByHash` is not needed — the real
table is `RefreshToken`, not `Session`.

_Follow-up (minor):_ `replacedByToken` stored the rotated token's raw value;
switched to `hashRefreshToken(newToken)` so the database only ever holds
a SHA-256 hash instead of a valid credential.

## Item 5 — WebAuthn MFA

**Today**: TOTP-based MFA is implemented. WebAuthn (passkeys) is not.

**Hardening**:

1. Add `WebAuthnCredential` model (clinicId, userId, credentialId,
   publicKey, signCount, lastUsedAt, transports).
2. Endpoint pair: `/auth/webauthn/register/{begin,finish}` and
   `/auth/webauthn/login/{begin,finish}`.
3. UI: enrollment in `apps/app-vite/src/features/settings/security/` and
   `apps/internal-vite/src/features/staff/security/`.
4. Recovery codes (one-time) for users who lose all keys.

## Item 8 — Automated KEK rotation

See [ADR 0007](../architecture/decisions/0007-kek-rotation-cadence.md).
Land the multi-version env scaffold first; ship the re-wrap scheduler
in a follow-up.

## Item 9 — Webhook secret overlap

**Today**: each provider (Razorpay, WhatsApp, etc.) has a single
secret. Rotation requires brief downtime or a manual cutover.

**Hardening**:

1. Per-provider env `*_WEBHOOK_SECRET_VERSIONS` (JSON list of versions).
2. Verifier accepts a signature from any active version for a
   configurable overlap window.
3. Operator UI (`apps/internal-vite/src/features/integrations/webhooks/`) to
   add/remove a version.

## Acceptance

Each item closes when:

- Code lands.
- Migration + backfill (if any) runs in production.
- A check in `scripts/checks/` enforces the new posture.
- The corresponding line in SYSTEM_DESIGN_AND_PATTERNS.md §28.1 is
  struck through with the resolving PR number.
