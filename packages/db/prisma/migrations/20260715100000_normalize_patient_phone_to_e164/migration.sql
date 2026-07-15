-- Backfill: rewrite legacy bare-10-digit Indian mobile numbers on Patient to
-- E.164 (`+91XXXXXXXXXX`) so the column has a single canonical form going
-- forward. Idempotent and safe to re-run.
--
-- Scope
-- -----
-- The product is India-only, so a 10-digit number with no prefix is treated
-- as an Indian mobile. International numbers are excluded (they wouldn't
-- match `^\d{10}$` anyway) and non-10-digit legacy values are left alone —
-- if any exist, they're handled case-by-case after this migration.
--
-- Soft-deleted rows are skipped on purpose: those records are on the
-- retention/anonymization path (DPDP erasure) and we don't want to
-- incidentally re-touch a `deletedAt` or `version` timestamp that the
-- compliance scheduler is going to read.
--
-- We also bump `version` so the optimistic-concurrency guard in the patient
-- command service still rejects any in-flight update that was built from the
-- pre-migration row.
--
-- DRY RUN (run before applying to confirm scope):
--   SELECT COUNT(*) FROM "Patient"
--     WHERE "phoneNumber" ~ '^\d{10}$' AND "deletedAt" IS NULL;

UPDATE "Patient"
  SET
    "phoneNumber" = '+91' || "phoneNumber",
    "version"     = "version" + 1,
    "updatedAt"   = NOW()
  WHERE "phoneNumber" ~ '^\d{10}$'
    AND "deletedAt" IS NULL;
