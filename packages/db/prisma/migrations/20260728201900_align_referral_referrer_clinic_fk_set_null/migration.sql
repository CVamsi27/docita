-- Align Referral.referrerClinicId FK with the schema's optional relation.
--
-- `20260727140000_referral_referrer_clinic_id_nullable` flipped
-- `Referral.referrerClinicId` to nullable so partner-only Referral rows
-- (with only `referrerId` set) can be stored. The schema declares
-- `referrerClinic Clinic?` (optional, no explicit onDelete), which
-- Prisma maps to `ON DELETE SET NULL ON UPDATE CASCADE`. The original
-- FK added in `20251127172503_add_billing_subscriptions_referrals`
-- was `ON DELETE RESTRICT` because the column was NOT NULL at the
-- time, so the constraint definition is now out of sync with the
-- schema and the deploy drift check (`scripts/deploy/verify-db-schema-sync.sh`)
-- rejects production with:
--
--   [*] Changed the `Referral` table
--     [-] Removed foreign key on columns (referrerClinicId)
--     [+] Added foreign key on columns (referrerClinicId)
--
-- This migration is a constraint-only refinement, idempotent, no data
-- change. It is the additive-only, schema-locked follow-up that the
-- prior nullable migration should have included but did not.

ALTER TABLE "Referral"
  DROP CONSTRAINT IF EXISTS "Referral_referrerClinicId_fkey";

ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_referrerClinicId_fkey"
  FOREIGN KEY ("referrerClinicId") REFERENCES "Clinic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
