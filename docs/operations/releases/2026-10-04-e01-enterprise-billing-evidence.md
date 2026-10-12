# E01 enterprise/billing evidence — 2026-10-04

Backlog item: **E01 — Enterprise/billing** (*Decision required:* membership,
entitlement exit, commercial versioning and true-up need explicit history).

Acceptance clause: *repeated issuance is stable; membership changes preserve
historical billing; alerts have actual delivery evidence.*

All three clauses are implemented and verified (clauses 1–2 landed first; clause 3
completed in a second pass using the approach agreed in the first).

## 1. What was found

Both implemented clauses were correctness defects, not design gaps.

### Clause 2 — repeated issuance was not stable

`generateAdjustmentInvoice` in
`enterprise-contract-invoice-command.service.ts` derived its invoice number from
`nanoid(8)` and then `create`d both a `SubscriptionPayment` and an
`EnterpriseContractInvoice` with **no lookup guard**. Its siblings
(`generateAnnualPrepayInvoice`, `generateSetupFeeInvoice`) both guard with a
`findFirst` first, so they were already retry-stable; the adjustment path was
the outlier. Concretely, a retried or double-clicked
`POST /internal/enterprise-contracts/:id/adjustment-invoice` **billed the
customer twice**, because every attempt was a distinct issuance.

### Clause 1 — membership changes did not preserve historical billing

`addMember` and `removeMember` wrote `snapshot: {}` on their
`EnterpriseContractRevision`, while `upsert` and `changeStatus` wrote a real
snapshot of the prior contract. A membership revision therefore recorded *that* a
clinic joined or left, but not the entitlement it held at that moment — so
"was this clinic covered by invoice X" could not be reconstructed from revision
history.

## 2. Implementation

### Clause 2 — caller-supplied idempotency key

`idempotencyKey` was added to `enterpriseAdjustmentInvoiceRequestSchema`
(`packages/types/src/billing/enterprise-contract.ts`) as a **required** field:
`.min(8).max(120)` and restricted to `[A-Za-z0-9._:-]` so it cannot corrupt the
derived invoice number. Required rather than optional because an adjustment
without a key double-bills on every retry, and adjustment invoices are real
money.

- The invoice number is now `ENT-ADJ-<contractNumber>-<sha256(contractNumber:key)[0:16]>` —
  deterministic per key, hashed to stay inside the column width.
- Re-submitting the same key upserts the same `SubscriptionPayment` (via the
  existing `clinicId_invoiceNumber` unique) and the same
  `EnterpriseContractInvoice`, and returns the prior invoice.
- Reusing a key with **different** terms is rejected with a `BadRequestException`
  rather than silently returning the earlier invoice, which would hide the
  mismatch.
- Issuing a genuinely new adjustment means presenting a new key.

This mirrors the existing `Invoice.idempotencyKey` + `findByIdempotencyKey`
pattern already used by `POST /invoices`, so no new mechanism was introduced.

### Clause 1 — membership snapshots

New `enterprise-contract-revision-history.ts` exports
`buildMembershipSnapshot` and `activeMemberClinicIds`. Both member mutations now
snapshot the entitlement-bearing terms (fee, discount, cycle, currency, term
dates, all `included*` allowances) plus the active member set at the moment of
the change, tagged `ADDED` / `REMOVED` with the `changedClinicId`.

The snapshot reflects state **after** the change, so a revision always records
the entitlement that applied from its `effectiveDate` forward.

The helpers were extracted into their own module because inlining them pushed
`enterprise-contracts-command.service.ts` to 420 lines, over the 400-line
`check:file-size-budget` service limit.

## 3. Verification

```
pnpm --filter @workspace/types run check-types     # exit 0
pnpm --filter @docita/api run check-types          # exit 0
cd apps/api   && pnpm exec jest src/domains/enterprise-contracts
cd packages/types && pnpm exec vitest run test/enterprise-contract.test.ts
pnpm lint            # exit 0
pnpm verify:standard # exit 0
```

| Layer | Result |
| --- | --- |
| API unit — enterprise-contracts | **69 passed, exit 0** (6 suites) |
| `@workspace/types` contract tests | **5 passed, exit 0** |
| `check-types` (types + api) | exit 0 |
| `pnpm lint` / `pnpm verify:standard` / `check:utc-instant-storage` | exit 0 |

New assertions, each mutation-verified (fix removed → test fails):

| Mutation | Result |
| --- | --- |
| Snapshot loses `change` / `changedClinicId` | 2 tests fail (`snapshots the entitlement state…`, `snapshots the remaining entitlement state…`) |
| Invoice-number hash gains a random component | `derives the same invoice number for the same key…` fails |
| `snapshot: {}` restored on `addMember` | 3 tests fail |

Coverage added:

- clause 2: create path; same key → same invoice number; same key → prior
  invoice returned with **no writes**; same key + different terms → rejected;
  new key → second bill issued; terminated contract → refused.
- clause 1: `addMember` snapshots terms + post-add member set; `removeMember`
  snapshots remaining set; neither writes `{}`; exited clinics excluded.
- contract: missing / too-short / malformed key rejected; non-positive and
  non-integer amounts still rejected.

## 4. Scope limits and honest gaps

- **No e2e coverage exists for these routes.** `POST /internal/enterprise-contracts/:id/*`
  is `Role.INTERNAL`-gated and has no e2e spec in `apps/api/test/`. The evidence
  above is unit + contract level plus a real migration proof. The controller's own
  wiring is unverified by an integration test.
- **Existing adjustment invoices are not backfilled.** Rows created before this
  change keep their `nanoid`-derived invoice numbers; they are unaffected, but
  a retry of a *pre-existing* adjustment still cannot be deduplicated.
- **This is a breaking request-contract change.** Any current caller of the
  adjustment endpoint must now send `idempotencyKey` or receive a 400. No caller
  exists in-repo (the route is INTERNAL-only and driven by the internal app), but
  the internal admin UI must be updated before this ships.
- Clause 1 fixes *future* revisions only. Membership changes already recorded
  with `snapshot: {}` are not reconstructed; no backfill was attempted, since
  the historical terms cannot be recovered after the fact.

## 5. Clause 3 — alert delivery evidence (implemented)

### What was wrong

`EnterpriseTrueUpAlert` rows were created **before** the alert email was sent, and
send failures were only logged. The row therefore asserted that an alert had been
*raised*, not that anyone received it — so "alerts have actual delivery evidence"
was false, not merely unverified.

### What changed

New enum `TrueUpAlertDeliveryStatus { PENDING, DELIVERED, PARTIAL, FAILED,
UNKNOWN }` plus `deliveredTo`, `deliveredAt` and `failureDetail` on
`EnterpriseTrueUpAlert`.

The row is still written first, so a crash mid-send still leaves an audit trail;
it is then updated with what actually happened:

| Outcome | Status | `deliveredAt` |
| --- | --- | --- |
| Every recipient accepted | `DELIVERED` | set |
| Some accepted, some failed | `PARTIAL` | `null` |
| No recipient accepted | `FAILED` | `null` |
| Send threw / never completed | `UNKNOWN` | `null` |
| No recipients configured | `UNKNOWN` at insert | `null` |

`deliveredTo` records the addresses that actually accepted, and `failureDetail`
carries per-recipient reasons, so a `PARTIAL` row is actionable rather than a
bare flag.

### Migration and backfill

`20261004120000_enterprise_trueup_alert_delivery_status` adds the enum, the four
columns and an index, then backfills **every existing row to `UNKNOWN`**. Existing
alerts are deliberately *not* marked `DELIVERED`: their delivery was never
recorded, and `PENDING` would wrongly imply a send still in flight.

### Verification

| Check | Result |
| --- | --- |
| `prisma migrate deploy` on a scratch DB | exit 0 |
| `migrate diff --from-config-datasource --to-schema` | **`No difference detected.`**, exit 0 |
| `information_schema` type of `deliveredAt` | `timestamp with time zone` |
| New rows default | `PENDING` (verified by inserting 2 rows) |
| Backfill statement on those rows | `UNKNOWN` — never `DELIVERED` |
| `pnpm check:utc-instant-storage` | exit 0 |

The `migrate diff` check caught a **real defect on the first attempt**: I had
written `TIMESTAMP(3)` without `WITH TIME ZONE`, which drifted from the schema's
`@db.Timestamptz(3)`. Fixed before shipping; the second run is clean. Scratch DB
dropped afterwards.

Mutation-verified: forcing `deliveryStatus` to always be `DELIVERED` fails 3 tests
(`records FAILED…`, `records PARTIAL…`, `never marks an alert DELIVERED when the
provider reports failure`).

### What still is not proven

- **"DELIVERED" means the provider accepted the message**, not that a human read
  it. `EmailService.send` returns provider acceptance; inbox delivery is beyond
  what this code can attest. That distinction is why the column is named
  `deliveryStatus` and not `readAt`.
- **No e2e covers this path** (same gap as clauses 1–2): the routes are
  `Role.INTERNAL`-gated with no spec in `apps/api/test/`. Evidence is unit level
  plus the migration proof above.
- **Backfill is honest but lossy**: pre-existing alerts stay `UNKNOWN` forever.
  Reconstructing their real outcome would require provider-side logs.


`EnterpriseTrueUpAlert` rows are created **before** the alert email is sent, and
send failures are only logged (`logger.warn`). There is no delivery-status field
on the model, so an "alert" row asserts nothing about delivery — clause 3 is
currently **false**, not merely unverified.

**Agreed approach (decided 2026-10-04, not yet implemented):** add a delivery
status column, persist the send outcome, and backfill existing rows as
`UNKNOWN` rather than implying they were delivered. This is a migration plus a
persisted send result, so it was held out of this pass rather than half-landed.

## Evidence index

- Schema: [`packages/types/src/billing/enterprise-contract.ts`](../../../packages/types/src/billing/enterprise-contract.ts)
- Contract tests: [`packages/types/test/enterprise-contract.test.ts`](../../../packages/types/test/enterprise-contract.test.ts)
- Invoice command: [`apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-invoice-command.service.ts`](../../../apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-invoice-command.service.ts)
- Revision history: [`apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-revision-history.ts`](../../../apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-revision-history.ts)
- Command service: [`apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts-command.service.ts`](../../../apps/api/src/domains/enterprise-contracts/application/services/enterprise-contracts-command.service.ts)
- Clause 3 service: [`apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-true-up-command.service.ts`](../../../apps/api/src/domains/enterprise-contracts/application/services/enterprise-contract-true-up-command.service.ts)
- Clause 3 migration: [`packages/db/prisma/migrations/20261004120000_enterprise_trueup_alert_delivery_status/migration.sql`](../../../packages/db/prisma/migrations/20261004120000_enterprise_trueup_alert_delivery_status/migration.sql)