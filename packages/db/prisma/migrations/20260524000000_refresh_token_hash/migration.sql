-- Refresh tokens at rest: P0.3 (2026-05-24).
--
-- Add a `tokenHash` column to RefreshToken so new sessions can be persisted
-- as sha256(raw) instead of the raw nanoid(64). Reads fall back to the
-- legacy `token` column for sessions issued before this migration; new
-- writes set `token` to NULL.
--
-- All changes are additive per the locked-schema policy:
--   * The new `tokenHash` column is NULL-able and uniquely indexed
--     (Postgres permits multiple NULLs in a UNIQUE column).
--   * `token` becomes NULL-able — existing non-null values are unaffected
--     and the existing UNIQUE constraint still rejects duplicates.
--   * A new index on tokenHash supports the new lookup path.

ALTER TABLE "RefreshToken" ALTER COLUMN "token" DROP NOT NULL;

ALTER TABLE "RefreshToken" ADD COLUMN "tokenHash" TEXT;

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");
