# ADR 0015 — Billing accounting semantics (collection, currency, refunds, finalization)

- **Status:** Proposed — awaiting sign-off (backlog item **F02**, "Decision required")
- **Date:** 2026-10-03
- **Owners:** Billing/product (decision), Platform/backend (implementation)
- **Backlog:** `docs/operations/DOCITA_IMPROVEMENT_BACKLOG.md` → F02

## Context

Canonical minor-unit columns (`*Cents`, integer paise) and the `InvoiceStatus`
enum already exist, and `apps/api/src/domains/billing/core/rules/invoice-payment-rollup.ts`
is the single source of truth for "which sessions count as settled money".

What is *not* defined is the accounting model around that: which events count as
collected revenue, how finalized commercial context is frozen, how mixed
currencies are grouped, and how refunds and late captures land in reporting
periods. Reviewing the current code found four concrete issues.

### Issue 1 — mixed currencies are added as one amount (confirmed defect)

`getPaymentActivity` in `invoices-query.service.ts` iterates settled sessions
and does `totalCents += session.amount`, while merely reassigning
`currency = session.currency` on each iteration. If a clinic ever has sessions in
more than one currency inside the reporting range, the total silently adds
unlike minor units and reports whichever currency happened to come last.

`PaymentSession.currency` and `Invoice.currency` are both plain
`String @default("INR")`, so nothing at the database level prevents a mixed set
from existing.

### Issue 2 — refunds are excluded but never netted out (gap)

`SETTLED_PAYMENT_STATUSES` is `[CAPTURED, PAID]`, and
`findReconciliationCandidates` treats `REFUNDED` as terminal. So a refunded
session stops counting as settled money, but no negative entry is ever recorded.
An invoice that was PAID, then refunded, keeps `amountPaidCents` and status
`PAID`: the paid-state rollup has no concept of a reversal. `PaymentSessionStatus`
already has a `REFUNDED` member, but no code path consumes it.

### Issue 3 — no record of which provider delivery caused a status change (gap)

F01 added an atomic capture claim keyed on `providerPaymentId` plus an outbox
event carrying `invoiceId`, `clinicId`, `providerPaymentId` and `amountPaise`.
That is the collection audit trail. It does not, however, carry the *commercial
context* (plan, tier, mode, price book version) that the money was collected
against, so historical amounts cannot be re-derived if pricing changes later.

### Issue 4 — "collected" and "earned" are not distinguished

`getPaymentActivity` groups by payment channel and returns a single
`totalCents`. `Invoice.grandTotalCents` is the billed amount and
`amountPaidCents` the collected amount, but no surface distinguishes *collected*
(cash actually received) from *earned* (recognized revenue for delivered
service). Aggregating invoice creation would overstate collected revenue, which
is exactly the failure the backlog warns about.

## Decision

Adopt the following definitions. Each is a product/billing decision; the
implementation notes are the mechanical consequence.

### D1 — Collected revenue is a property of settled payment sessions, never invoices

**Definition.** Collected revenue for a period is the sum of `PaymentSession.amount`
for sessions in a settled state (`CAPTURED`, `PAID`) whose capture instant falls
in the period. Invoice creation is a billing event and must never be summed as
collected revenue.

**Consequence.** Reporting reads sessions, not invoices. Any surface that reports
"revenue" must state whether it is billed (`Invoice.grandTotalCents`) or
collected (settled sessions), and the two must never be added together.

### D2 — Currency is part of the reporting key; unlike currencies are never summed

**Definition.** Every monetary aggregate is grouped by `currency` first. There is
no single cross-currency total.

**Consequence.** `getPaymentActivity` changes from `{ totalCents, currency }` to
per-currency buckets, and the response shape becomes a list keyed by currency.
Adding a second currency to a clinic must not require a reporting migration,
but it must stop being arithmetically wrong.

### D3 — Refunds are negative settled entries, not status removal

**Definition.** A refund produces an explicit reversal entry attributed to the
period the refund settled in. Refunds do not retroactively rewrite the period
the original capture landed in.

**Consequence.** Net collected revenue for a period is
`settled captures − refunds settled in that period`. An invoice whose payments
were fully refunded is not PAID; its paid-state rollup must account for
reversals. The mechanism (a reversal row vs. a signed amount on the session) is
an implementation choice for the implementing PR; the reporting invariant is
what this decision fixes.

### D4 — Finalized commercial context is immutable

**Definition.** Once an invoice is finalized, the commercial context that
produced its amounts (plan, tier, mode, price book version, currency) is frozen
on the invoice and cannot be silently recomputed.

**Consequence.** Recalculation of a finalized invoice is an explicit, audited
correction that preserves the prior values; it is never an implicit side effect
of a pricing change.

### D5 — Late captures land in the capture period, and this is disclosed

**Definition.** A capture recovered later (by webhook retry or by the F01
reconciliation job) is attributed to the instant it actually settled with the
provider, not the instant the session was created.

**Consequence.** `paidAt` is the accounting instant. Reporting windows must be
able to show that a period's total changed after the fact, so the F01
reconciliation summary must remain observable.

## Acceptance criteria

The implementing PR is complete when:

1. A mixed-currency range returns per-currency buckets and never sums unlike
   minor units — covered by a test with two currencies in one range.
2. A refunded capture is excluded from collected revenue and reverses the
   invoice's paid state — covered by a test that captures, refunds, and asserts
   the invoice is no longer PAID and the period total is netted.
3. Rounding identities hold: `sum(items) = subtotal`, `subtotal − discount + tax
   = grandTotal`, and `amountPaidCents ≤ grandTotalCents` unless an overpayment
   is explicitly modeled.
4. A finalized invoice's amounts are unchanged by a later pricing change —
   covered by a test that finalizes, changes pricing, and re-reads the invoice.
5. A late capture changes the reporting period of its settlement instant, and
   the reconciliation summary reports it.

## Open questions for sign-off

1. **Reversal mechanism:** separate reversal row, or a signed amount plus
   `refundedAt` on the payment session? A reversal row keeps the capture
   immutable and is the recommended default.
2. **Partial refunds:** allowed? If yes, does partial refund move the invoice to
   `PARTIALLY_PAID`, and is that distinguishable from "partially collected"?
3. **Overpayment:** is collecting more than `grandTotalCents` permitted, and if so
   how is the excess represented?
4. **Currency support:** is multi-currency a near-term product reality, or is
   this a correctness guard only? This decides whether D2 needs a migration to
   per-currency reporting tables or only per-currency response buckets.
5. **Earned revenue:** is revenue recognition in scope for this product at all,
   or does reporting stop at collected? If out of scope, say so explicitly so no
   surface implies otherwise.

## Consequences

**Positive.** Reporting becomes arithmetically sound under mixed currency and
refunds; "revenue" stops being ambiguous between billed and collected; finalized
commercial history becomes auditable.

**Negative.** `getPaymentActivity` changes shape (a breaking change for any
consumer). Refund support requires a write path that does not exist today.
Both are contained inside `apps/api/src/domains/billing/` plus the reporting
surfaces that read it.

## References

- `apps/api/src/domains/billing/core/rules/invoice-payment-rollup.ts`
- `apps/api/src/domains/billing/application/services/invoices-query.service.ts`
- `apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.ts` (F01)
- `packages/db/prisma/schema.prisma` (`Invoice`, `PaymentSession`)
- ADR [0010](0010-transactional-outbox.md) — outbox delivery for capture events
