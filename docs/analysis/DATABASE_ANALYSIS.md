# Database Analysis — Schema, RLS, Retention, Growth

Point-in-time: **2026-08-01**. Source: `packages/db/prisma/schema.prisma` (4,887 lines), `docs/compliance/RLS_ROLLOUT.md`, `docs/compliance/DPDP_READINESS.md`, `docs/operations/MIGRATION_NOTES.md`, `packages/db/README.md`.

## 1. Shape

- **147 models, 112 enums, 488 `@@index` + 41 `@@unique` + 83 `@unique` fields, 159 timestamped migrations** (+ 1 intentional superseded folder `add_patient_user_link/` kept for `_prisma_migrations` consistency).
- **Largest models by field count**: Clinic (114), User (83), Patient (74), Invoice (56), Appointment (53), EnterpriseContract (40), AppointmentArchive (37), Subscription (34), SubscriptionPayment (30), Prescription (28), InsuranceClaim (28), TierPricing (25), Consent (25), WhatsAppBroadcastJob (24), VitalSign (24).
- Tenancy: single-key **`clinicId` on 91/147 models (62%)** — 319 `clinicId` column occurrences total across all models. No tenantId/workspaceId. 56 unscoped (users, catalogs: IcdCode/CptCode/LoincCode, FeatureFlag…).
- Soft delete: only 3 models — `User`, `Patient`, `StaffNotification` (30-day window + archival).
- Datetime: **469/469 DateTime fields are `@db.Timestamptz(3)`** — 100% convention compliance (verified: zero DateTime fields without Timestamptz).

## 2. RLS — live, production-enabled, operator-dependent

- Migration `20260502143500_add_rls_policies` enables RLS + one permissive `tenant_isolation` policy (gated by `app.rls_enabled`) on every table with a `clinicId` column.
- `RLS_ENABLED=true` in prod `fly.toml` + worker; `RlsService.runScopedTransaction(clinicId)` + `rls-routing` Prisma extension forward ops through request-scoped tx.
- **Open caveat**: `FORCE ROW LEVEL SECURITY` is off and the API still runs as the owner role until the operator points `DATABASE_URL` at the non-owner `docita_app` role (RLS_ROLLOUT.md Step 2 — manual step, still in force). Until then policies don't bind on those tables.
- RLS NULL tenancy: `OutboxEvent.clinicId` and `ApiRequest.clinicId` nullable (system-scoped rows carry NULL under RLS) — intentional but worth a policy decision.

## 3. Retention & unbounded-append tables

- **23 append-heavy tables**: AuditLog, AuditLogArchive, WhatsappLog, WhatsappLogArchive, AppointmentArchive, ErrorLog, ApiRequest, SystemMetric, UsageRecord, UsageEvent, OutboxEvent, ApiHttpIdempotencyRecord, WebhookReplayDedupe, CronHeartbeat, EmailSuppression, QueueJob, ImportJob, BulkImportJob, PdfJob, InsuranceClaimEvent, DatabaseControlAction, AnalyticsSnapshot, PerformanceAggregate.
- `DataRetentionScheduler` + `archival.service.ts` enforce: audit 90d, WhatsApp 180d, appointments 2y, soft-deletes 30d.
- **Only TTL-native table**: `ApiHttpIdempotencyRecord` (`processingExpiresAt`/`recordExpiresAt`).
- **Gap**: retention windows are **global, not per-tenant** (`ClinicSettings.auditRetentionDays` doesn't exist; AUDIT_EXPORT.md = design only). Enterprise contracts will need per-tenant retention.
- Growth pair to watch: `UsageEvent` (raw stream, `[clinicId, type, timestamp]` index) + `UsageRecord` (period aggregates, `@@unique([clinicId, type, periodStart])`).

## 4. Index health

- Strong: 488 indexes; hot tables well covered (AuditLog 7, WhatsappLog 8, ApiRequest 8, UsageEvent 4, OutboxEvent 4 with `[processedAt, nextAttemptAt]` backoff, idempotency sweep `[status, processingExpiresAt]`).
- 5 models with zero `@@index`: NotificationPreferences (7f), PatientSocialHistory (16f), ReminderSettings (15f), FeatureFlagDefinition (8f), LeavePlan (10f) — all 1:1 tables guarded by unique constraints (patientId/clinicId @unique), so low real risk; `db:analyze-indexes` + `db:check-query-plans` guardrails exist for hot-path changes.
- Sequence tables: `InvoiceSequence`, `MrnSequence` (explicit counters — no Postgres sequences).

## 5. Migration discipline

- Schema **locked additive-only since 2026-03-22**; destructive migrations need the `-- check-migration-reversibility: one-way` marker + recorded exception (only one: `20260408193000_replace_super_admin_with_internal`).
- Most recent: referral-partner self-service series (2026-07-27/28), database-control actions, money-cents columns (`20260705130000_add_money_cents_columns`), E.164 patient phone normalization (data-rewriting).
- Guards: `check:migration-reversibility`, `check:migration-safety`, `db:migrate:dry-run`/`db:migrate:safe` scripts, `db-migrations.yml` workflow.

## 6. Dead schema surface (see TRASH_ANALYSIS §2)

- 11 enums with zero app-code references (incl. `BpMigrationStatus` — dead column on VitalSign), 15 types-mirrored-but-API-unused enums, `HospitalRole`/`Specialization` soft-deprecated.

## 7. Scaling path (DEPLOYMENT.md, current posture)

| Stage | DB | Notes |
|---|---|---|
| 0–20 clinics (now) | `db.t4g.micro` (Mumbai ap-south-1) | + API 2 GB, scale-to-zero off-hours |
| 20–50 | `db.t3.small` | move when sustained |
| 50–100 | `db.t3.medium` + read replica | — |
| 100+ | `db.r6g.large` + PgBouncer | — |

**Top 5 DB actions**: (1) complete RLS Step 2 — run API as `docita_app` role in prod; (2) design per-tenant retention (enterprise contracts); (3) decide the 11 dead enums + dead column (reversible drops); (4) monitor UsageEvent/AuditLog growth vs the 90/180d scheduler (alert on archive lag); (5) keep the additive-only lock — any new model must carry `clinicId` + `Timestamptz(3)` + indexes.
