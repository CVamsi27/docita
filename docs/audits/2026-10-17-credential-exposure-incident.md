# Credential exposure incident — 17 October 2026

Containment is incomplete. This incident supersedes any readiness statement that
depends on uncompromised application secrets. No clinical source release or
field-data migration has occurred.

## Confirmed evidence

The operator supplied a Neon notice dated 16 October identifying
`.env.example` at commit `8745ca628ba0ee6bc97556cc8266f059c2f7480f`
(23 November 2025), organization `org-ancient-tooth-36241932`, project
`restless-tooth-24759148`, endpoint `ep-jolly-voice-ah256u04`.
The initial read-only check confirmed that the historical credential still
authenticated as `neondb_owner` to `neondb` over verified TLS with UTC. It read
database identity settings, not clinical rows. The endpoint password was then
rotated and rejection verified as recorded below. The authenticated Neon CLI
account still lacks membership of the owning organization; other branch
credentials, consumer inventory and control-plane audit access remain unverified.

Current production is the separate Neon project `icy-river-59903017`, endpoint
`ep-plain-rain-a1zogxgl`. Its runtime database URL and password do not match the
exposed historical artifact. No current production database password was rotated
as part of this investigation.

An independent scan also found credentials in two retired generated artifacts at
`apps/app/.open-next/cloudflare/next-env.mjs`. Their Git change locations include
`9d984a171542fa4c97f24346c0d9922c64e4a763` (10 March 2026),
`1128d8adf48f8b8f81583ccbbeb5e7cd2772e4ca` and
`9bd41c594bfc3de73a8253c433fbd02bb5f0b5b9` (23 March 2026).
The artifacts are absent from the current candidate tree but remain in history.
Fresh runtime comparisons confirmed matching production JWT, field-encryption,
live Razorpay API and webhook secrets. The current Meta token and production
database credential did not match those artifacts. Values were compared in
memory and never printed in investigation evidence.

The configured-secret scan examined all 34,211 reachable blobs, including binary
blobs: 444,798,994 bytes, 59,889 total Git objects, 31 distinct configured values.
Gitleaks with explicit default rules and no fingerprint/comment exemptions
scanned 1,088 commits and about 199.6 MB, reporting 107 findings. That raw count
includes test fixtures and still needs complete provider-by-provider triage;
it is not a count of active compromised credentials. The bounded triage below
records its current disposition. GitHub's security API
returned no open or resolved alerts, which did not establish absence of exposure.
The published PR #322 range from `376462fe8` through `1a53f039b` scans clean with
the same independent default rules. The reported Neon commit predates that PR.

## Signing containment completed

At 04:38 UTC / 10:08 IST, production API runtime verification confirms fresh,
independent `JWT_SECRET` and `PUBLIC_DOCUMENT_SIGNING_SECRET` values. Both Fly
application secret stores were updated. The existing API and worker images,
service configuration and idle behavior were preserved; the worker was updated
without starting and remains stopped. The field-encryption key and database
credential were unchanged. No source image was built or released for containment.

Protected local operator/API configuration and GitHub's existing JWT secret
consumer were updated. A replacement signing-key bundle was age-encrypted to
the previously verified offline recipient before activation; the private recovery
identity remained offline. A fresh actual-runtime recovery packet includes the
retained field key and both replacement signing keys, encrypted directly with
native age to the same verified recipient. Its shared verifier/core has the
existing 12 synthetic regression cases; the new packet still needs independent
offline proof.

Readiness returns 200. At 04:39 UTC / 10:09 IST, production synthetic monitoring
passes all three probes, including the dedicated staff login, with alerts and
automatic restarts disabled. Old access signatures and public-link signatures
must not be accepted after the signing change. Refresh-token revocation is a
separate decision and was not performed; affected users may need to sign in
again, and old signed public links require reissue.

## Live API credential rotation verified

At 08:19 UTC / 13:49 IST, the replacement live API credential authenticates
(HTTP 200), and the exposed live credential is rejected (HTTP 401). The operator
updated both protected local files, so replacement qualification uses the
historical artifact directly rather than treating either mutable file as the old
credential. Provider checks use read-only requests and discard response bodies;
no payment or webhook was created.

Both Fly stores and existing machines received the new API pair. Runtime
fingerprint verification confirms the new pair and preserved JWT, document
signing, field-encryption and database values. Images and service/idle settings
are unchanged, and the worker remains stopped. A provider recovery bundle is
age-encrypted to the verified offline recipient; independent offline proof is
still required. The repository Razorpay secrets feed sandbox E2E jobs, so they
were preserved rather than receiving live credentials. An operator helper was
stopped before its proposed GitHub updates, then finalized through runtime
verification without repeating the machine updates.

At 08:19:55 UTC / 13:49:55 IST, all three production synthetic probes pass,
including staff login, with alert delivery and automatic restarts disabled.

At this API-only checkpoint, the webhook signing secret still matched the
exposed value. The subsequent webhook rotation below supersedes that status.

## Webhook signing rotation verified

At 10:55 UTC / 16:25 IST, the operator's fresh webhook secret is applied to both
Fly stores and existing machine configurations. API runtime comparisons confirm
the new webhook secret and API pair, with JWT, document signing, field encryption
and database credentials preserved. Images and idle settings remain unchanged;
the clinical worker remains stopped. GitHub sandbox secrets were not changed.
An additional age-encrypted provider recovery bundle is prepared, with its
independent offline proof still open.

At 10:57 UTC / 16:27 IST, the actual deployed compiled webhook verifier accepts
the new HMAC and rejects the exposed-key HMAC and a tampered body. Its replay
repository is replaced only within this isolated invocation by an in-memory
claim stub; no production database is used for that proof. Both public payment
and subscription webhook routes return **401** for the exposed signature over
a synthetic, nonfinancial probe body. No valid signed webhook was submitted to
the handlers, and no payment was processed. An initial historical-artifact
selection harness failure was retained; the corrected check qualifies both
historical artifacts before contacting the runtime.

At 10:57:19 UTC / 16:27:19 IST, production synthetic monitoring passes all three
probes, including staff login, with its alerts and automatic restarts disabled.
Provider-origin delivery under the new secret and end-to-end payment completion
have not been independently verified.

## Alerted Neon endpoint password revoked

At 11:38 UTC / 17:08 IST, only the alerted endpoint's `neondb_owner` password was
changed using the role's permitted SQL password change. The preflight verified
TLS/channel binding, UTC, the expected database/role, zero other sessions using
that role, and statement/duration/error/audit logging settings before sending the
password statement. Role attributes and grants were preserved. A fresh random
replacement was saved directly to protected local configuration and age-encrypted
to the verified offline recipient before the change; no credential appeared in
command arguments or printed evidence.

Fresh direct and pooled connections both accept the replacement and reject the
exposed password with PostgreSQL `28P01`. Current production and prepared staging
URLs were unchanged; no clinical rows, schema, Fly images or worker state changed.
This proves revocation at the alerted endpoint. Neon password changes are
[branch-scoped](https://neon.com/docs/manage/roles); the inaccessible organization's
other branches and access history have not been assessed. Do not infer project-wide
revocation from this endpoint result.

## Field-key rotation qualification

At 11:48 UTC / 17:18 IST, an isolated invocation of the actual deployed compiled
encryption module passes its current-key write/read check but fails retained-key
recovery for both old `v1` and unversioned ciphertext. The probe uses disposable
keys and synthetic values only: no production key, row or configuration is read
or changed. The deployed module SHA256 is
`60948c781e571cb3e2e85f0dc5f802c8de744aedc7a275e5333753c652aaf8b5`.
An earlier SSH attempt could not reach the idle machine; the qualified repeat
first verified API liveness and completed all checks. Both records are retained.

At 11:50 UTC / 17:20 IST, a read-only, TLS/UTC-verified aggregate query covered all
17 fields mapped by the candidate's three encryption consumers: patient fields,
clinic secrets and referrer payout details. It found no matching versioned or
legacy ciphertext formats, with zero mapping gaps. No row values were exported or
decrypted. This does not establish absence of plaintext rows, historical encrypted
data, backup dependencies or consumers outside the inspected mapping. It does not
justify discarding the exposed field key or skipping recovery qualification.

The authenticated fallback repair is tested in the candidate, not deployed.
Keep the field key unchanged until the reviewed compatible artifact is deployed,
the exact recovery checks pass there, and independent custody/recovery and a
reviewed migration/rollback plan are complete. See [key rotation](../operations/KEY_ROTATION.md).

## Bounded historical-finding triage

At 11:54 UTC / 17:24 IST, 105 of the 107 scanner findings had source values
qualified in process memory without printing or writing those values. Findings
are repeated locations, not unique credentials. Current classification is:

| Disposition                                  | Findings | Remaining limit                                                                         |
| -------------------------------------------- | -------: | --------------------------------------------------------------------------------------- |
| Documented placeholders / repeating fixtures |       14 | No production-validity claim follows from unrelated fixtures.                           |
| Idempotency fixtures / boolean expressions   |       16 | Noncredential matches in their inspected source contexts.                               |
| Expired JWTs in historical logs              |       10 | Expiry is verified; log contents and possible access still require incident assessment. |
| Confirmed exposed field key                  |        6 | Retained for recovery; rotation remains open.                                           |
| Confirmed exposed Razorpay secrets           |        6 | API/webhook rotations above are verified.                                               |
| Historical Meta token                        |        2 | One unique token; read-only provider check returns 401 / OAuth 190, subcode 463.        |
| Retired preview / server-action build keys   |       26 | Old deployment and preview inventory remains open.                                      |
| Other findings                               |       27 | Owner/context review remains open, including two unqualified source values.             |

The Meta check sent no message and changed no current provider credential. Its
rejection proves that historical token is not currently accepted by that check;
it does not establish absence of past use. Unknown findings and inaccessible audit
records remain open rather than being classified from scanner counts alone.

At 11:58:30 UTC / 17:28:30 IST, a fresh Node.js 22.22.0 production synthetic run
passes all three probes, including the dedicated staff login, with alerts and
automatic restarts disabled. This point-in-time result does not replace hosted
monitoring, provider-origin payment proof or the required observation periods.

## Open containment and recovery work

- Obtain the old Neon organization's control-plane access to inventory other
  branches, consumers and audit evidence. The alerted endpoint password is
  revoked; that result does not cover cloned branches. Keep its protected
  operator reference separate from current production and staging URLs.
- Independently verify provider-origin webhook delivery under the new secret;
  the operator confirms its provider change, while the tests above prove the
  deployed verifier and rejection boundaries. Earlier saved values were first
  test-mode and then unchanged live credentials; the 08:10 UTC provider check
  still accepted the old pair. The later API and webhook rotations above
  supersede those credential statuses. Reconcile
  historical delivery failures through verified provider state: older webhook
  retries can retain the old signature, and the compromised secret must not be
  re-enabled to accept them. See [Razorpay signature validation](https://razorpay.com/docs/webhooks/validate-test/).
- Preserve the field key needed by existing ciphertext and recovery copies.
  Prepare authenticated re-encryption, rollback and independent recovery proof
  before replacing it. The retained-key fallback fix is only in the proposed
  candidate; it must not be assumed present in the unchanged production image.
- Assess possible unauthorized access using protected provider/application audit
  evidence. Credential exposure is confirmed; data access has not been assessed.
- Complete the remaining historical scanner findings and any other provider
  revocations. The separate replacement signing packet must join offline
  recovery custody.
- Plan coordinated historical-artifact cleanup after revocation and review.
  Deleting a current file does not revoke credentials. No force push, protected
  history rewrite or claim of cache/fork removal has occurred.

The repository Gitleaks configuration previously had only an allowlist and did
not enable its default rules: a synthetic token probe returned success without
detection, while the independent default configuration detected it. The config
now explicitly extends the default rules, and the same synthetic probe detects
the token after the change. The final staged diff also scans clean with the
enabled rules. No broad new fixture exemption was added.
