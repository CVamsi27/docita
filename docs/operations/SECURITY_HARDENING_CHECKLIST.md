# Security Hardening Checklist

Point-in-time: **2026-08-05**. Owner: this doc consolidates the security
posture across [`SECURITY_ANALYSIS.md`](../analysis/SECURITY_ANALYSIS.md),
[`AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md), [`RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md),
[`DPDP_READINESS.md`](../compliance/DPDP_READINESS.md), [`PHI_ENCRYPTION_POLICY.md`](../compliance/PHI_ENCRYPTION_POLICY.md),
[`SECRET_ROTATION_CHECKLIST.md`](SECRET_ROTATION_CHECKLIST.md), and the
13+ static security checks in `pnpm verify:standard`. The goal is one
checklist that maps every protection to its evidence, owner, and exit
criterion.

> Docita is a HIPAA-adjacent clinical SaaS. Security is not a feature; it is
> a precondition for operating.

---

## 1. Defense-in-depth matrix

| Layer                       | Protection                                        | Evidence                                                          | Owner         | Status |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | ------------- | ------ |
| **Network — DNS**           | DNSSEC, CAA records, no wildcard                  | Registrar config (Cloudflare)                                     | Release eng   | ✅     |
| **Network — TLS**           | TLS 1.3 only, HSTS preload                        | `verify:app-security-headers`                                     | Release eng   | ✅     |
| **Network — CSP**           | Per-app CSP, Razorpay iframe allowlisted          | `apps/{app,internal}/public/_headers`; checkout smoke    | Release eng   | 🟡 OPEN (P5.10) |
| **Network — rate limit**    | Per-IP, per-user, per-tenant                      | [`RATE_LIMITS.md`](RATE_LIMITS.md); API controller `ThrottlerGuard` | Backend       | ✅     |
| **Auth — login**            | bcrypt (cost 12), CSRF, MFA-ready                 | `auth.controller.ts`; `check:auth-tenant-safety`                   | Backend       | ✅     |
| **Auth — session**          | httpOnly refresh cookie, hashed in DB, family revocation | `RefreshToken.tokenFamily`; `check:sensitive-logging`         | Backend       | ✅     |
| **Auth — CSRF**             | double-submit cookie + header                     | `CsrfInterceptor`; webhook POST exemption per `check:webhook-csrf-exemption` (P5.12) | Backend | ✅     |
| **Auth — RBAC**             | controller-level posture, `@Roles`/`@Public`/`@RequireFeature` | `check:controller-rbac`; `check:require-feature-guard`     | Backend       | ✅     |
| **Auth — ABAC**             | attribute-based (in addition to RBAC)             | [`ABAC_MIGRATION_PLAN.md`](../analysis/ABAC_MIGRATION_PLAN.md)     | Backend       | 🟡 IN PROGRESS |
| **Auth — tenant safety**    | tenant guard on every controller                  | `check:auth-tenant-safety`                                        | Backend       | ✅     |
| **Auth — direct URL**       | 404 on cross-tenant resource access               | e2e multi-tenant fixture (P3.5)                                   | Backend       | ✅     |
| **Data — at rest**          | AES-256-GCM on 13 patient fields                  | [`PHI_ENCRYPTION_POLICY.md`](../compliance/PHI_ENCRYPTION_POLICY.md); `check:phi-encryption-coverage` | Backend | ✅ |
| **Data — DB connection**    | Pooling, prepared statements, no raw concat        | `check:json-parse-guarded`; Prisma parameterised queries           | Backend       | ✅     |
| **Data — RLS**              | Row-Level Security, bypass annotation required    | [`RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md); `check:rls-rollout-readiness`; `check:rls-bypass-annotation` | Backend | ✅ (rolled out) |
| **Data — JSON columns**     | Zod schema per `Json?` column                     | `check:json-column-zod`                                           | Backend       | ✅     |
| **Data — upload validation**| magic-byte + extension + MIME triple check        | `check:upload-validation`                                         | Backend       | ✅     |
| **Data — signed URLs**      | TTL ≤ 5m, session-bound HMAC                      | [`AUTH_HARDENING.md` Item 3](../compliance/AUTH_HARDENING.md); `check:pdf-bearer-cap` | Backend | ✅ |
| **Data — DPDP retention**   | 7-year clinical, 90-day upload expiry              | [`DPDP_READINESS.md`](../compliance/DPDP_READINESS.md)             | Compliance    | ✅     |
| **Data — sub-processors**   | Documented, contract-bound                         | [`DPDP_SUBPROCESSORS.md`](../compliance/DPDP_SUBPROCESSORS.md)     | Compliance    | ✅     |
| **Audit — access**          | Every PHI read emits `VIEW_*` audit event         | `check:phi-read-audit`; e2e `patient-phi-read-audit.e2e-spec.ts`  | Backend       | ✅     |
| **Audit — write**           | Create/update/delete audited; old/missing blocked  | `check:audit-coverage` (ledger `docs/audits/evidence/2026-05-audit-coverage.md`) | Backend | ✅ (P5.15 closed 2026-08-06) |
| **Audit — log shape**       | Single `auditLogSchema` across API + clients      | `check:zod-interface-parity`; e2e `zod-response-contracts`         | Backend       | ✅     |
| **Audit — redaction**       | PHI never logged in plaintext                     | `check:sensitive-logging`; `check:no-console-runtime`             | Backend       | ✅     |
| **Audit — export**          | Role-gated, tenant-scoped, 401/403/404             | [`AUDIT_EXPORT.md`](../compliance/AUDIT_EXPORT.md); `/audit-logs`  | Backend       | ✅     |
| **Webhooks — signature**    | HMAC over raw body, key per provider              | `check:webhook-signatures`                                        | Backend       | ✅     |
| **Webhooks — replay**       | `WebhookReplayDedupe` table, 24h window           | `check:webhook-replay-protection`; e2e `razorpay-subscription-webhook` | Backend    | ✅     |
| **Webhooks — CSRF**         | Exempted from double-submit (server-to-server)     | `csrf.interceptor.ts` `/webhooks/*` POST exemption; `check:webhook-csrf-exemption` (P5.12) | Backend | ✅ |
| **Frontend — XSS**          | No `dangerouslySetInnerHTML`; React escapes by default | `check:no-console-runtime`; lint                              | Frontend      | ✅     |
| **Frontend — telemetry**    | Same-origin app proxy; no cross-origin POST       | `check:browser-telemetry-same-origin`                             | Frontend      | ✅     |
| **Frontend — Sentry scrub** | PHI list matches data-access output               | `check:sentry-scrubbing`; `check:sentry-scrubber-parity`          | Frontend      | ✅     |
| **Frontend — third-party**  | One library per concern, vetted deps              | `pnpm audit`; AGENTS.md §16.1                                     | Release eng   | ✅     |
| **Supply chain — advisories**| `pnpm audit --audit-level=high` exits 0           | CI `security-audit` job; OSV scanner on PRs                       | Release eng   | ✅ (0 high) |
| **Supply chain — overrides**| `pnpm.overrides` for known broken pins            | [`PNPM_OVERRIDES.md`](PNPM_OVERRIDES.md)                           | Release eng   | ✅     |
| **Supply chain — lockfile** | `--frozen-lockfile` in CI                          | `.github/workflows/*`                                              | Release eng   | ✅     |
| **Ops — secret rotation**   | Ordered checklist, staging-validated              | [`SECRET_ROTATION_CHECKLIST.md`](SECRET_ROTATION_CHECKLIST.md)     | Release eng   | ✅     |
| **Ops — breach response**   | Documented, on-call owned                         | [`BREACH_NOTIFICATION_RUNBOOK.md`](BREACH_NOTIFICATION_RUNBOOK.md) | Compliance    | ✅     |
| **Ops — DR**                | DB clone in separate region, RPO/RTO defined      | [`DR_RUNBOOK.md`](DR_RUNBOOK.md)                                   | Release eng   | ✅     |
| **Ops — staging = main**    | Staging auto-mirrors main, no integration line    | AGENTS.md §11.3                                                    | Release eng   | ✅     |
| **Ops — branch cap**        | ≤ 2 open feature/hotfix branches                  | AGENTS.md §11.3                                                    | Release eng   | ✅     |

**Totals**: 35 protections, 32 ✅ (green), 3 🟡 (in progress), 0 ❌ (broken).
The 3 open items are P5.x in [`POST_CUTOVER_GAPS.md`](../analysis/POST_CUTOVER_GAPS.md).

---

## 2. Pre-deploy security gates (mandatory)

Every release must pass all of these. A failure blocks the deploy.

```bash
# Static
pnpm check:sensitive-logging
pnpm check:no-console-runtime
pnpm check:phi-encryption-coverage
pnpm check:phi-boundary-parity
pnpm check:phi-read-audit --enforce
pnpm check:audit-coverage
pnpm check:audit-logging --enforce
pnpm check:auth-tenant-safety
pnpm check:controller-rbac
pnpm check:require-feature-guard
pnpm check:workspace-profile-gating
pnpm check:tier-comparisons
pnpm check:rls-rollout-readiness
pnpm check:rls-bypass-annotation
pnpm check:upload-validation
pnpm check:webhook-signatures
pnpm check:webhook-replay-protection
pnpm check:job-idempotency
pnpm check:browser-telemetry-same-origin
pnpm check:sentry-scrubbing
pnpm check:sentry-scrubber-parity
pnpm check:pdf-pipeline
pnpm check:pdf-bearer-cap
pnpm check:razorpay-adapters
pnpm check:client-storage-usage
pnpm check:form-schema-extends
pnpm check:contract-strictness
pnpm check:json-parse-guarded
pnpm check:json-column-zod
pnpm check:non-null-assertion
pnpm check:as-cast-density          # 79 file-level allow-files
pnpm check:native-button-types
pnpm check:native-ui-affordances
pnpm check:button-primitive
pnpm check:accessible-name
pnpm check:user-facing-errors

# Dependency
pnpm audit --audit-level=high      # exits 0
pnpm knip                          # unused exports/types/deps

# E2E
pnpm --filter @docita/api run test:e2e   # 23 suites, 143+ tests

# Cloudflare build
pnpm build:cloudflare:production

# Synthetic probes
pnpm monitor:synthetic

# Headers
pnpm verify:app-security-headers
```

The full list is in `pnpm verify:standard`; the security subset above is the
minimum for any release touching auth, data, or webhooks.

---

## 3. Threat model (high-level)

| Threat                                | Mitigation                                                                | Residual risk                                      |
| ------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| Stolen session cookie                 | httpOnly, SameSite=Lax, CSRF double-submit                                | Lost device → forced re-login (refresh revocation) |
| Stolen refresh token                  | Hashed in DB, family revocation on reuse                                  | Single-use refresh window                          |
| Brute force login                     | bcrypt cost 12, rate limit `RATE_LIMITS.md`, account lockout              | Distributed attacks mitigated at edge              |
| Credential stuffing                   | Same as above + Cloudflare Turnstile on login + register (P5.17 — wired 2026-08-06; enforced when `TURNSTILE_SECRET_KEY` is set; **HARDENED 2026-08-07**: boot fails in staging/production without the secret, so the fail-open dev mode can never reach an internet-facing API) | Distributed attacks mitigated at edge; enforcement needs the Turnstile keys provisioned in prod (deploy-order: set them in the same release) |
| Token replay (JWT)                    | 5-min TTL access tokens, refresh rotation, jti claim                      | 5-min replay window                                |
| PHI exfiltration via Sentry           | Sentry scrubber list + same-origin telemetry + allowlist parity check     | Scrubber list must stay in sync with new PHI fields |
| Cross-tenant data leak                | tenant guard, RLS, e2e multi-tenant fixture, `check:auth-tenant-safety`    | RLS bypass must be annotated                       |
| Webhook forgery                       | HMAC-SHA256 + per-provider secret + replay dedupe                          | Provider key compromise                             |
| Upload-based exploit (XSS, RCE)       | Magic-byte + ext + MIME triple, server-side re-encode                     | Zero-day in image processing                        |
| SQL injection                         | Prisma parameterised; no `$queryRawUnsafe`                                | `$queryRaw` with bypass annotation must justify     |
| CSRF                                  | Double-submit; `/webhooks/*` exempt (server-to-server, signed)            | New POST routes must opt-in via the controller decorator |
| Open redirect                         | URL allowlist on `redirect_uri` params                                    | OAuth flows (when added)                           |
| Supply chain (npm)                    | `pnpm audit` + OSV scanner; `pnpm.overrides`; `--frozen-lockfile`         | 0 known high (2026-08-05)                          |
| Insider threat (employee with prod)   | Audit log + role-gated access; JIT elevation                              | PHI export requires break-glass + audit             |
| Patient portal abuse                  | OTP rate limit, phone verification                                        | SMS pump cost                                      |
| Doctor verification bypass            | `@RequireFeature(DOCTOR_VERIFICATION)` guard + P5.18 override audit (support `ticketId` required + `DOCTOR_VERIFICATION_OVERRIDDEN` audit row written before the mutation) | INTERNAL-role override remains possible by design (support path), now fully traceable |
| Razorpay payment forgery              | HMAC verify + event ID dedupe + idempotent handler                        | Provider compromise                                 |
| OpenAI PHI leakage                    | `check:sensitive-logging` + LLM call redaction layer                      | New PHI surface not yet covered                    |
| Cloudflare secret leak                | Secret rotation policy + `_headers` review                                | Compounded if not rotated in time                  |
| DDoS                                  | Cloudflare edge + per-IP rate limit + Fly.io scale-out                    | Layer 7 attack on Worker                            |

---

## 4. P5 security items (consolidated, sourced)

These are the open security work consolidated from `EXECUTION_PLAN.md`,
`REPO_GAPS_AND_IMPROVEMENTS.md`, and `POST_CUTOVER_GAPS.md`:

| Item                                                  | Source                        | P5 row  |
| ----------------------------------------------------- | ----------------------------- | ------- |
| CSP checkout smoke (Razorpay iframe)                  | EXECUTION P4.4                | P5.10   |
| Web Vitals reporter + same-origin proxy               | EXECUTION P4.5                | P5.8    |
| CSRF webhook regression test (e2e + static check)     | EXECUTION P4.3 (closed batch) | P5.12   |
| Audit coverage baseline (per-service audit emit map)  | EXECUTION P4.4                | P5.15   |
| `as-cast-density` allow-file inventory (drift monitor)| SUPPRESSION_LEDGER §2         | P5.2    |
| `non-null-assertion` allow-file inventory             | SUPPRESSION_LEDGER §3         | P5.3    |
| `.jscpd.json` ignore count ratchet (≤ 25)              | SUPPRESSION_LEDGER §4         | P5.4    |
| `zod-interface-parity.json` ratchet (≤ 8)              | SUPPRESSION_LEDGER §5         | P5.5    |
| `eslint-disable*` ratchet (≤ 0 in production)         | SUPPRESSION_LEDGER §6         | P5.6    |
| reCAPTCHA on auth surface (P5.x, planned)             | Threat model                  | P5.17 — **DONE 2026-08-06** (Turnstile wired on login + register; see POST_CUTOVER_GAPS §10) |
| Doctor verification override audit trail              | Threat model                  | P5.18 — **DONE 2026-08-06** (ticketId + audit row + e2e regression) |

---

## 5. Compliance mapping

| Regulation         | Doc                                               | Owner         |
| ------------------ | ------------------------------------------------- | ------------- |
| DPDP (India)       | [`DPDP_READINESS.md`](../compliance/DPDP_READINESS.md) + sub-processor list | Compliance |
| HIPAA (US, future) | [`PHI_ENCRYPTION_POLICY.md`](../compliance/PHI_ENCRYPTION_POLICY.md) | Compliance |
| ABDM (India FHIR)  | `check:abdm-fhir-contract`; ABDM-bound endpoints  | Backend       |
| IT Act 2000        | Audit retention (7 years), access logs            | Compliance    |
| Breach (72h rule)  | [`BREACH_NOTIFICATION_RUNBOOK.md`](BREACH_NOTIFICATION_RUNBOOK.md) | Compliance |

---

## 6. Quarterly security review

Every quarter, refresh:

1. Threat model (§3) — re-rank by likelihood × impact; add any new threats.
2. Pre-deploy gate list (§2) — re-run all; retire any that haven't caught a
   regression in 90 days.
3. Dependency audit (`pnpm audit --audit-level=high`) — confirm 0 high.
4. Sentry scrubber parity — verify scrub list covers the new PHI surfaces.
5. RLS rollout — verify no new bypass annotations were added without a
   rationale.
6. Webhook signatures — verify all provider keys are rotated within 180 days.
7. Secret rotation — confirm all critical secrets rotated within 90 days.
8. CSP review — confirm `_headers` still allowlists only the live origins.

Output: a 2-page report in `docs/audits/<date>-quarterly-security.md`. The
report is referenced from [`EXECUTION_PLAN.md`](../analysis/EXECUTION_PLAN.md).

---

## 7. References

- [`SECURITY_ANALYSIS.md`](../analysis/SECURITY_ANALYSIS.md) — full posture
  analysis.
- [`AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md) — auth roadmap.
- [`RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md) — RLS rollout state.
- [`PHI_ENCRYPTION_POLICY.md`](../compliance/PHI_ENCRYPTION_POLICY.md) —
  field-level encryption.
- [`SECRET_ROTATION_CHECKLIST.md`](SECRET_ROTATION_CHECKLIST.md) — rotation
  procedure.
- [`BREACH_NOTIFICATION_RUNBOOK.md`](BREACH_NOTIFICATION_RUNBOOK.md) —
  incident comms.
- [`DR_RUNBOOK.md`](DR_RUNBOOK.md) — disaster recovery.
- [`SUPPRESSION_LEDGER.md`](../analysis/SUPPRESSION_LEDGER.md) — every
  static-analysis suppression.
- [`POST_CUTOVER_GAPS.md`](../analysis/POST_CUTOVER_GAPS.md) — open P5.x
  items.
