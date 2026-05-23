# Docita API

NestJS API for authenticated clinical, billing, patient, and platform workflows.

## Domain catalogue (25 domains)

`analytics`, `appointments`, `billing`, `clinical`, `clinics`, `custom-fields`, `dashboard`, `doctor-clinics`, `doctors`, `documents`, `enterprise-contracts`, `feedback`, `inventory`, `ipd`, `leave`, `medical-documents`, `patient-portal`, `patients`, `payments`, `prescriptions`, `public-booking`, `reminders`, `subscriptions`, `users`, `webhooks`, `whatsapp`

All domains follow the layered pattern in `apps/api/src/domains/<domain>/{application,core,infrastructure,presentation}`. See `apps/api/src/domains/appointments` as the reference implementation (AGENTS.md §15.1).

## Guard chain

Every non-public HTTP route passes through the following guards in order:

1. **`JwtAuthGuard`** — validates the Bearer token and populates `req.user`
2. **`RolesGuard`** — enforces `@Roles(...)` decorator; rejects if role is insufficient
3. **`TenantGuard`** — resolves and attaches the clinic/tenant context; rejects cross-tenant access
4. **`SubscriptionStatusGuard`** — blocks requests when the clinic's subscription is lapsed

Additional optional guards: `FeatureFlagGuard` (tier/feature gating), `EmailVerifiedGuard`, `ConsentGuard`, `IpRateLimitGuard`, `UserRateLimitGuard`, `TenantRateLimitGuard`. All guards live in `apps/api/src/shared/modules/auth/`.

## How to add a new endpoint (see AGENTS.md §9.1)

1. Define or update the Zod request/response schema in `packages/types/src/`.
2. Create or update the domain module in `apps/api/src/domains/<domain>/`.
   - DTO wraps the Zod schema: `export class MyDto extends createZodDto(mySchema) {}`.
   - Controller declares explicit auth posture (`@Public`, `@Roles(...)`, `@RequireFeature(...)`). Enforced by `scripts/checks/check-controller-rbac.mjs`.
   - Application service orchestrates the use case.
   - Repository isolates Prisma; maps DB rows to domain objects.
3. Register the module in the domain's NestJS module file.
4. Update or add hooks in `packages/data-access/` for the frontend.
5. Add tests closest to the changed behavior.

## Domain pattern

- Controllers stay in `presentation/controllers`.
- Application services orchestrate use cases (split large ones into `XCommandService` + `XQueryService` + `XCalculator`).
- Repositories isolate Prisma access; no `@prisma/client` in controllers or services.
- DTOs wrap `@workspace/types` schemas with `createZodDto`.

Global guard and tenant behavior is configured in `apps/api/src/app.module.ts`. Do not weaken tenant, role, subscription, or feature checks for sensitive operations.
