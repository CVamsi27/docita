# Docita API

NestJS API for authenticated clinical, billing, patient, and platform workflows.

## Domain Pattern

- Add endpoints inside `apps/api/src/domains/<domain>`.
- Controllers stay in `presentation/controllers` and declare explicit auth posture.
- Application services orchestrate use cases.
- Repositories isolate Prisma and external persistence.
- DTOs wrap Zod schemas from `@workspace/types` with `createZodDto`.

Global guard and tenant behavior is configured in `apps/api/src/app.module.ts`. Do not weaken tenant, role, subscription, or feature checks for sensitive operations.
