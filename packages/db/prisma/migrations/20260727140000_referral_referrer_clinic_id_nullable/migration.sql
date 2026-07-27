-- Allow partner-only Referral rows (additive only, schema-locked).
--
-- Previously `Referral.referrerClinicId` was NOT NULL because the table
-- only carried clinic-to-clinic referrals. The partner self-service
-- portal adds a second shape: a Referral with only `referrerId` set
-- (the new `RFR-XXXXXX` partner path), which needs `referrerClinicId`
-- to be nullable. No data migration — every existing row already has
-- a non-null value, so the constraint drop is a no-op for them.

ALTER TABLE "Referral" ALTER COLUMN "referrerClinicId" DROP NOT NULL;
