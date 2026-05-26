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

## Item 4 — Drop unhashed refresh tokens

**Today**: refresh tokens are stored hashed in `Session.tokenHash` but
the controller also returns the raw token in the response and stores a
cookie. A row leak limited to `tokenHash` columns is safe; a leak that
includes recent in-memory request payloads is not.

**Hardening**:

1. Server-side rotation issues a new opaque token + invalidates the
   previous tokenHash row in the same transaction.
2. Never return the raw token in any error path; always return 401
   with no payload.
3. Add a `Session.replacedByHash` self-reference so we can detect
   replay of a rotated token.

## Item 5 — WebAuthn MFA

**Today**: TOTP-based MFA is implemented. WebAuthn (passkeys) is not.

**Hardening**:

1. Add `WebAuthnCredential` model (clinicId, userId, credentialId,
   publicKey, signCount, lastUsedAt, transports).
2. Endpoint pair: `/auth/webauthn/register/{begin,finish}` and
   `/auth/webauthn/login/{begin,finish}`.
3. UI: enrollment in `apps/app/features/settings/security/` and
   `apps/internal/features/staff/security/`.
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
3. Operator UI (`apps/internal/features/integrations/webhooks/`) to
   add/remove a version.

## Acceptance

Each item closes when:

- Code lands.
- Migration + backfill (if any) runs in production.
- A check in `scripts/checks/` enforces the new posture.
- The corresponding line in SYSTEM_DESIGN_AND_PATTERNS.md §28.1 is
  struck through with the resolving PR number.
