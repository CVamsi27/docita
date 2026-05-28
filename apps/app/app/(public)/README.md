# `(public)/` route group

Patient- or partner-facing flows that are publicly accessible URLs but
authorize via a per-session secret (not a logged-in clinician session).
Examples:

- `/mobile-upload/[id]` — patient uploads documents to a doctor session
  via `?uploadSecret=...` (QR-code-based).

The `(book)/` group at the top level covers the public booking flow.
The `(auth)/` group covers login/register/MFA flows.

Pages here MUST NOT assume an authenticated clinician session. They MUST
NOT show the clinician sidebar/topbar; layouts here should be minimal
chrome only.
