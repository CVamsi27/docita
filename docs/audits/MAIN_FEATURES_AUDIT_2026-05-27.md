# Main Features Audit - 2026-05-27

**Date:** 2026-05-27  
**Scope:** Login/auth, onboarding, appointments, patients, consultation, prescription, invoice, billing, settings, and repo-wide safety checks.  
**Method:** Re-verified the prior Explore findings against the current tree, then remediated confirmed code-addressable issues in this branch.

## Severity legend

| Severity | Definition |
|---|---|
| Critical | Can cause PHI exposure, cross-tenant access, incorrect money/tax state, or unrecoverable workflow corruption. |
| High | Can break a clinician-critical workflow, lose auditability, or create inconsistent persisted state. |
| Medium | Incorrect validation, missing guardrail, or maintainability risk with bounded blast radius. |
| Low | Documentation, hygiene, or polish issue without immediate safety impact. |

## Summary

| Severity | Confirmed | Fixed | Deferred | Not reproduced |
|---|---:|---:|---:|---:|
| Critical | 5 | 5 | 0 | 0 |
| High | 4 | 4 | 0 | 0 |
| Medium | 4 | 4 | 0 | 0 |
| Low | 1 | 1 | 0 | 1 |

## Top confirmed issues

| # | Severity | Feature | Source | Status | Issue | Fix summary | Verification |
|---|---|---|---|---|---|---|---|
| 1 | Critical | Auth / tenancy | [apps/api/src/shared/modules/auth/decorators/clinic-scoped.decorator.ts:24](../../apps/api/src/shared/modules/auth/decorators/clinic-scoped.decorator.ts) | Fixed | Clinic-scoped guard returned `true` even when no scope existed or when requested clinic differed from the authenticated user's clinic. | Guard now fails closed for missing scope and throws forbidden on mismatches, while preserving `returnEmptyOnMissing`. | `pnpm --filter @docita/api test -- clinic-scoped.decorator.spec.ts` |
| 2 | Critical | Login / auth | [apps/api/src/shared/modules/auth/auth/auth-session.service.ts:103](../../apps/api/src/shared/modules/auth/auth/auth-session.service.ts) | Fixed | Refresh-token rotation created a replacement token before revoking the old token, allowing a concurrent reuse race. | Rotation now happens in one transaction with a conditional single-use update; reuse revokes the token family. Logout and revoke-all also use hashed-token matching. | `pnpm --filter @docita/api test -- auth.service.spec.ts` |
| 3 | Critical | Onboarding | [apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts:27](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts) | Fixed | Onboarding sessions were stored in a process-local `Map`, so server restart or multi-replica routing lost state. | Added persistent `OnboardingSession` Prisma storage, expiry lookup, cleanup method, and persistence tests. | `pnpm --filter @docita/api test -- onboarding-data.service.spec.ts` |
| 4 | Critical | Invoice / billing | [packages/db/prisma/schema.prisma:830](../../packages/db/prisma/schema.prisma) | Fixed | Invoice money had legacy `Float` source-of-truth fields and nullable cent fields. | Backfilled cent fields, made them required with defaults, and continued normalizing writes through cent helpers while keeping API numbers backward-compatible. | `pnpm --filter @workspace/db run db:generate` |
| 5 | Critical | Billing | [apps/api/src/domains/billing/application/services/payments-command.service.ts:210](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) | Fixed | Manual settlement updated invoice status before creating the payment session, leaving a possible `PAID` invoice without payment trail. | Payment-session create and invoice status update now run in one transaction. | `pnpm --filter @docita/api test -- payments.service.spec.ts` |
| 6 | High | Billing webhooks | [apps/api/src/domains/billing/application/services/payments-command.service.ts:282](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) | Fixed | Razorpay webhook handler logged and returned `ok` without processing `payment.captured`. | `payment.captured` and `payment_link.paid` now resolve a payment session, capture it, mark the invoice paid transactionally, and dedupe by provider payment id. | `pnpm --filter @docita/api test -- payments.service.spec.ts` |
| 7 | High | Appointments | [apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts:105](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) | Fixed | Outside-business-hours validation returned `valid: true` and compared only whole hours. | Validation now compares minute-of-day boundaries and rejects out-of-hours appointments. | `pnpm --filter @docita/api test -- appointment-scheduling-rules.service.spec.ts` |
| 8 | High | Invoice GST | [apps/api/src/domains/billing/core/services/tax-calculator.service.ts:70](../../apps/api/src/domains/billing/core/services/tax-calculator.service.ts) | Fixed | Place of supply defaulted buyer state to seller state, risking incorrect CGST/SGST vs IGST. | Tax calculation no longer falls back to seller state for buyer/place-of-supply; taxable invoices require explicit supply state. | `pnpm --filter @docita/api test -- invoices.service.spec.ts` |

## Findings by feature

| # | Severity | Feature | Source | Status | Issue | Fix summary | Verification |
|---|---|---|---|---|---|---|---|
| 9 | Medium | Settings | [apps/app/features/settings/rules/settingsRules.ts:3](../../apps/app/features/settings/rules/settingsRules.ts) | Fixed | Clinic hours accepted non-finite values through loose numeric checks. | Settings validation now rejects non-finite, equal, reversed, and cross-midnight active hours. | `pnpm --filter @docita/app test --run settingsRules.test.ts` |
| 10 | High | Invoice | [apps/api/src/domains/billing/application/services/invoices-command.service.ts:52](../../apps/api/src/domains/billing/application/services/invoices-command.service.ts) | Fixed | Generic invoice updates could bypass a single status-transition policy. | Added a shared invoice status-transition policy and kept payment-only transitions in payment command paths. | `pnpm --filter @docita/api test -- invoices.service.spec.ts` |
| 11 | Medium | Billing API | [packages/types/src/billing/invoices.ts:14](../../packages/types/src/billing/invoices.ts) | Fixed | Invoice money inputs accepted unsafe floating values and more than two decimal places. | Added shared money amount validation for finite, non-negative, two-decimal invoice inputs. | `pnpm --filter @docita/api test -- invoices.service.spec.ts` |
| 12 | Medium | Billing DB | [packages/db/prisma/schema.prisma:1400](../../packages/db/prisma/schema.prisma) | Fixed | Payment sessions had no durable provider payment id for webhook replay dedupe. | Added provider payment id persistence, repository lookup, and unique provider/payment id indexing. | `pnpm --filter @workspace/db exec prisma validate` |
| 13 | Medium | Onboarding cleanup | [apps/api/src/shared/modules/ephemeral-store/ephemeral-store-cleanup.scheduler.ts](../../apps/api/src/shared/modules/ephemeral-store/ephemeral-store-cleanup.scheduler.ts) | Fixed | Expiry cleanup depended on a process timer. | The worker-only ephemeral cleanup cron now purges expired onboarding sessions using the persisted expiry index. | `pnpm verify:standard` |
| 14 | Low | Patients / consultation / prescription | [apps/api/src/shared/common/select-fragments.ts:35](../../apps/api/src/shared/common/select-fragments.ts) | Not reproduced | No new cross-tenant Prisma leakage was confirmed in the re-check for the main touched invoice/patient selectors. | No code change needed; tenant-scoped repository methods and Prisma-boundary checks remain the active guardrail. | `pnpm check:prisma-boundary` |
| 15 | Low | Repo-wide | [docs/audits/MAIN_FEATURES_AUDIT_2026-05-27.md:1](MAIN_FEATURES_AUDIT_2026-05-27.md) | Fixed | No dated main-feature audit ledger existed for this run. | Added this dated audit ledger with status, source, fix summary, and verification details. | `pnpm check:hygiene` |

## Cross-cutting notes

- Existing outbox and optimistic-locking work was already present in the worktree before this pass. This remediation preserved that work and added the new audit migration alongside it.
- Billing API compatibility is preserved: clients still send and receive rupee-denominated numbers, while persistence now has required cent fields for canonical money.
- The GST place-of-supply fix intentionally fails closed for taxable invoices without a supply state. Product/legal policy may still define more specific derivation rules later.
- The onboarding storage change keeps the route contract unchanged; only server persistence changed.

## Recommended next steps

1. Run the full validation battery listed in `AGENTS.md` before pushing.
2. Expand Razorpay webhook coverage to additional event types (`payment.failed`, refunds) with explicit replay behavior.
3. Continue moving billing reads to cent-first projection helpers so legacy float fields can eventually be retired.
