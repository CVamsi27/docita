# Database Guide

Operational and design guidance for the Docita PostgreSQL + Prisma layer.

- Owner: Data Platform
- Review Cadence: Monthly (first Monday)
- Last Reviewed: February 15, 2026

## 1) Core Principles

- Tenant safety first for all clinic-scoped data.
- Index for real query patterns, not assumptions.
- Keep migrations safe, reversible, and observable.
- Treat patient-identifying fields as sensitive.

## 2) Prisma Workflow

Common commands:

```bash
pnpm db:generate
pnpm db:push
pnpm db:migrate
```

Use `db:migrate` for durable schema changes; avoid ad-hoc production schema edits.

## 3) Migration Standards

- Keep migrations small and reviewable.
- Flag risky operations (`DROP`, large backfills) early.
- Plan rollback paths for destructive changes.
- Validate migration impact in staging with production-like data shape.

## 4) Modeling Standards

- Include timestamps (`createdAt`, `updatedAt`) where appropriate.
- Add `clinicId` to tenant-scoped entities.
- Use enums consistently across DB and app layers.
- Prefer explicit relation names for readability.

## 5) Indexing Standards

- Add indexes for frequent filters, joins, sorting, and tenant scopes.
- Favor composite indexes for common multi-column predicates.
- Periodically audit index usage and prune unused indexes.

## 6) Data Safety

- Encrypted fields must remain encrypted at rest.
- Avoid exposing raw sensitive fields in logs/exports.
- Validate retention and archival behavior.

## 7) Performance Practices

- Paginate all large list queries.
- Avoid N+1 query patterns.
- Route read-heavy analytics/reporting to read replicas when available.

## 8) Common Pitfalls to Avoid

- Role enum drift between database and auth layers.
- Large monolithic migrations without rehearsal.
- Unbounded queries in user-facing endpoints.
- Missing tenant filters in custom SQL paths.
