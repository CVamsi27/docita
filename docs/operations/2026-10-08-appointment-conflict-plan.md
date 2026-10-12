# Appointment overlap contract implementation plan

> Execute inline using the installed executing-plans workflow. The approved roadmap's Phase 2 explicitly includes a shared overlap contract; the user's continuation authorizes this compatibility-preserving slice. Do not reopen approval for the existing design.

**Goal:** Close T-F1-F3: every rejected doctor/time overlap has the same typed HTTP 400 error, through both the preflight check and the PostgreSQL race invariant.

**Architecture:** Shared Zod schemas in `packages/types/src/contracts/appointments.ts` define the exception payload and its RFC 9457 response envelope. One API exception factory supplies both emitters. The global exception resolver recognizes this specific schema at HTTP 400 and retains its detail/field map; unrelated errors keep their existing resolution. The shared client parser consumes the canonical response before its compatibility fallback. No status-machine, retry, database schema or onboarding policy changes.

**Tech stack:** NestJS/Jest, PostgreSQL 16, Zod 3, shared data-access/Vitest, pnpm 10.30.3; CI-pinned Node 22.22.0 for database E2E.

## Design and compatibility

The response retains `status: 400` and `detail: "Doctor has conflicting appointment"`, adds/preserves `code: "APPOINTMENT_OVERLAP"`, and always contains `validationErrors.startTime` with the same friendly detail. Existing clients already consume code and field errors. The preflight's conflicting appointment ID/window is replaced with generic guidance: users need to choose another slot, not parse another appointment's identifier. Database losers gain the same field guidance. RFC metadata (`type`, `title`, `instance`, `timestamp`) remains supplied by the existing global filter, with optional development diagnostics.

The existing generic parser remains compatible with other problem responses and legacy bodies. This is not a generic global-error redesign. Auth, tenant checks, exclusion constraints, idempotency and successful booking remain unchanged. The test fixture injects a competing real row after the real overlap read to deterministically reproduce a stale preflight; it does not replace the database or weaken production guards.

## Task 1 — Reproduce all boundaries before implementation

**Modify:** `apps/api/src/domains/appointments/application/use-cases/create-appointment.use-case.spec.ts`, `apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.spec.ts`, `apps/api/src/shared/modules/error-handling/filters/http-exception.filter.spec.ts`, `apps/api/test/e2e/appointments/booking-contention.e2e-spec.ts`.

- [x] Assert the preflight rejection's actual exception response has code, detail and a start-time map; test both populated and absent conflict metadata. Use `instanceof BadRequestException` before reading responses, not unchecked catch casts.
- [x] Assert real repository exclusion translation supplies the same payload on save, update and patch; unrelated Prisma failures still rethrow.
- [x] Pass a typed overlap exception through the actual global filter and assert friendly detail, code and keyed validation errors survive. Existing unrelated/domain error cases remain green.
- [x] Mount `AllExceptionsFilter` in the contention E2E app. Strengthen every loser check to assert the payload, not only HTTP 400. Add sequential preflight rejection and a deterministic database loser: capture the real scheduling read, insert the competing appointment with those exact UTC bounds, return the captured result, and assert the rejected request. Restore the spy in `finally`.

Expected red: preflight lacks code; repository lacks the field map; production filter drops detail/fields. Keep isolated PostgreSQL fixture evidence separate from production-role evidence.

## Task 2 — Canonical schema and exception factory

**Modify:** `packages/types/src/contracts/appointments.ts`; create `packages/types/test/appointment-overlap.test.ts`.
**Create:** `apps/api/src/shared/common/errors/appointment-overlap-problem.ts`.
**Modify:** the create use case and Prisma write repository above.

- [x] Define `appointmentOverlapErrorSchema` with literal code, non-empty detail and required non-empty `validationErrors.startTime`. Infer its type with `z.infer`.
- [x] Compose `appointmentOverlapResponseSchema` from that payload plus the existing filter's RFC metadata, HTTP 400 and optional development fields; infer its type. Test valid envelope, wrong code/status and absent field-map rejection.
- [x] The exception factory returns `new BadRequestException(appointmentOverlapErrorSchema.parse({ code: appointmentOverlapErrorSchema.shape.code.value, detail, validationErrors: { startTime: detail } }))`, with the existing friendly detail defined once in the factory.
- [x] Replace both payload constructors with this factory. Keep unrelated write errors and preflight validation behavior intact.

## Task 3 — Production filter and client parity

**Modify:** `apps/api/src/shared/modules/error-handling/filters/http-exception-resolution.ts`, `packages/data-access/src/lib/api-error-body.ts`.
**Create:** `packages/data-access/src/lib/api-error-body.test.ts`.

- [x] After narrowing to `HttpException`, recognize the overlap payload only when status is 400. Return the schema-derived detail, field map and code. Preserve existing generic/Zod/auth/domain resolution.
- [x] Parse the full canonical envelope with `appointmentOverlapResponseSchema.safeParse` in the client problem parser; recognized bodies use the parsed shape. Keep existing generic parsing for other/legacy responses.
- [x] Test real client `buildApiRequestError(new Response(JSON.stringify(payload), { status: 400 }))` preserves code and start-time guidance. Assert canonical parsing strips unknown extra properties; pin legacy field errors, malformed/non-object bodies and unrelated errors through the existing fallback.

## Task 4 — Verify, document and commit

- [x] Run focused Jest regressions and packages/types/data-access Vitest tests; record expected red then green.
- [x] Run the real booking-contention E2E against a newly owned disposable PostgreSQL container on a free local port, with no credentials from production. Use Node 22.22.0 and a 4 GB heap; stop only the created container.
- [x] Build touched shared packages, typecheck API/types/data-access, lint, Knip, Prisma boundary and repository standards. Build API after shared outputs are ready; do not run concurrent builds against the same output directories.
- [x] Update `docs/architecture/API_DOCUMENTATION.md` with the exact overlap payload and sources; update T-F1-F3 in the companion backlog and roadmap. Keep previous evidence snapshots immutable and retain upstream security/release blockers.
- [x] Record current commands/results in a dated acceptance record, commit through normal hooks, and verify a clean tree. No push, merge, deployment or production DB writes.

## Acceptance

All tasks are complete. See the [dated validation record](releases/2026-10-08-appointment-conflict-validation.md) for exact results and remaining release blockers. The owned database fixture is retained only for the next approved auth compatibility checks and will be stopped after those checks.
