# @workspace/types

Zod-first contract package. Every shared shape starts here as a Zod schema; TypeScript types are derived with `z.infer`. No runtime business logic lives in this package.

**Rule:** define schema in Zod, export type via `z.infer` — no runtime business logic here.

## Folder map

| Folder | What lives here |
|---|---|
| `src/billing/` | `Tier` enum, `TierName`, `Feature` enum, `hasFeatureAccess`, subscription, invoice, payment, tax, enterprise-contract schemas |
| `src/shared/` | Users, clinics, appointments, consultations, prescriptions, FHIR, referrals, uploads, sidebar nav, custom fields, WhatsApp |
| `src/access/` | `APP_PERMISSIONS` const, `AppPermission` type, `access-matrix.ts` (role→permission map), `clinic-tier-map.ts` (DB tier string → `TierName`), `restrictions.ts`, `workspace-access.ts` |

## Update order

Change this package **before** changing API DTOs or frontend forms for the same shape.
- API DTOs wrap schemas via `createZodDto`.
- Frontend forms derive types from the same schema via `z.infer`.

## Boundaries

- Reusable Zod schemas and `z.infer` types only.
- Owns HTTP request/response contracts shared by API and clients.
- No persistence (Prisma), UI components, or app-specific orchestration.
- Prefer schema composition with `.pick()`, `.omit()`, and `.extend()` over copying field lists.

## Canonical example

```ts
// src/billing/tier.ts
export const tierSchema = z.enum(["STARTER", "ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE", "INTELLIGENCE"]);
export type TierName = z.infer<typeof tierSchema>;
```
