# Prisma client extensions

These are the `prisma.$extends(...)` plugins applied at the
`PrismaService` boundary. Their order matters: each extension wraps the
next, and inversions can silently bypass tenant or PHI checks.

## Application order

The wrapping order is established in
[`apps/api/src/prisma/prisma.service.ts`](../../../prisma/prisma.service.ts).
Keep this list in the same sequence as the chained `$extends(...)` calls.

```
PrismaClient
  → rls-routing.extension        (routes to the request RLS transaction)
  → encryption.extension         (encrypts/decrypts selected PHI columns)
  → audit-immutability.extension (blocks mutation of append-only audit rows)
  → tenant.extension             (injects clinicId filters; fails closed)
  → logging.extension            (records slow queries)
  → query-budget.extension       (counts request-scoped queries)
```

| Extension            | File                                                                 | Concern                                                                                  | Bypass mechanism                                                       |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tenant`             | [`tenant.extension.ts`](tenant.extension.ts)                         | Multi-tenant scope                                                                       | `runWithTenantBypass({ reason })`                                      |
| `encryption`         | [`encryption.extension.ts`](encryption.extension.ts)                 | Per-row envelope encryption of PHI columns (see `encryption-patient-fields.boundary.ts`) | n/a                                                                    |
| `audit-immutability` | [`audit-immutability.extension.ts`](audit-immutability.extension.ts) | Prevents updates to append-only tables (`AuditEvent`, `DpdpAuditEvent`)                  | `runWithAuditBypass({ reason })` (used during retention archival only) |
| `logging`            | [`logging.extension.ts`](logging.extension.ts)                       | Adds redacted query logging via `nestjs-pino`                                            | n/a                                                                    |
| `rls-routing`        | [`rls-routing.extension.ts`](rls-routing.extension.ts)               | Executes `SET LOCAL app.current_clinic_id` per query when `RLS_ENABLED=true`             | n/a (governs DB-level enforcement)                                     |
| `query-budget`       | [`query-budget.extension.ts`](query-budget.extension.ts)             | Emits structured warnings when one request exceeds its query budget                      | n/a (observability only)                                               |

## Invariants every change must preserve

1. **Order**: encryption MUST be inside tenant (so the encrypted ciphertext is filtered by `clinicId`, not the decrypted plaintext on read).
2. **No mid-stack bypass**: bypass helpers (`runWithTenantBypass`, `runWithAuditBypass`) set a flag the affected extension checks; adding a NEW extension must respect both flags if it touches the same tables.
3. **No extension I/O**: extensions must not make external calls (network, KMS) on the hot path. Encryption resolves DEKs via in-process cache; logging uses an in-process logger.
4. **Add a spec**: every new extension ships with a colocated `*.spec.ts` proving the read/write contract.

## Adding a new extension

1. Decide where it sits in the stack (above table). Document in this README.
2. Add the file as `<concern>.extension.ts` in this directory.
3. Wire it into `PrismaService` in the same order.
4. Provide a colocated spec covering at least:
   - happy path (extension applies)
   - bypass behavior (if any)
   - interaction with the extension layered immediately above and below it

## Why this README exists

SYSTEM_DESIGN_AND_PATTERNS.md §28.4 item 32: the extension order was
implicit in `prisma.service.ts`, and the bypass contract was scattered
across helpers. This README is the single place to verify both.
