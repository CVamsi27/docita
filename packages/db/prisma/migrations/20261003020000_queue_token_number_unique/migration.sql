-- Queue token identity invariant (backlog W01).
--
-- `QueueToken.tokenNumber` is the number a clinician calls from the waiting
-- room, so two live tokens sharing one number are a clinical-workflow failure,
-- not a cosmetic one. Allocation used to be read-then-write
-- (`findLastTodayTokenNumber` then `createToken`), so two parallel check-ins
-- for different appointments both read the same maximum and inserted the same
-- number. Nothing in the schema stopped it.
--
-- `tokenDay` records the clinic-local day the number belongs to, which is what
-- "today" meant to the allocator (numbers restart each day). The unique
-- constraint on (clinicId, tokenDay, tokenNumber) is the backstop that makes
-- duplicate numbers impossible regardless of application behavior.
--
-- Historical rows are backfilled from createdAt. If a clinic already has
-- duplicate numbers for one day, the constraint cannot be created without
-- renumbering live patient-facing data, so this migration reports them loudly
-- and leaves the constraint off; the atomic allocator added alongside it stops
-- new duplicates, and an operator can resolve the historical rows and re-run
-- to enable enforcement.
ALTER TABLE "QueueToken" ADD COLUMN "tokenDay" DATE;

UPDATE "QueueToken"
SET "tokenDay" = date_trunc('day', "createdAt")::date
WHERE "tokenDay" IS NULL;

DO $$
DECLARE
  dupes TEXT;
BEGIN
  SELECT string_agg(DISTINCT format('%s/%s/%s', "clinicId", "tokenDay", "tokenNumber"), ', ')
  INTO dupes
  FROM (
    SELECT "clinicId", "tokenDay", "tokenNumber"
    FROM "QueueToken"
    WHERE "tokenDay" IS NOT NULL
    GROUP BY "clinicId", "tokenDay", "tokenNumber"
    HAVING COUNT(*) > 1
  ) duplicates;

  IF dupes IS NOT NULL THEN
    RAISE WARNING
      'QueueToken already contains duplicate (clinicId, tokenDay, tokenNumber) rows: %',
      dupes;
    RAISE WARNING
      'The unique constraint was NOT created. Resolve these rows (renumber the later token in each group) and re-run this migration to enforce token-number uniqueness.';
  ELSE
    CREATE UNIQUE INDEX "QueueToken_clinicId_tokenDay_tokenNumber_key"
      ON "QueueToken" ("clinicId", "tokenDay", "tokenNumber");
  END IF;
END
$$;

CREATE INDEX "QueueToken_clinicId_tokenDay_idx"
  ON "QueueToken" ("clinicId", "tokenDay");