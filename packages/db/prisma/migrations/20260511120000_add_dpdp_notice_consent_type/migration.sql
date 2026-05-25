-- Adds DPDP_NOTICE value to ConsentType enum so we can record patient consent
-- to data processing under India's DPDP Act 2023 alongside the existing
-- clinical consent types. Additive only; no row changes.
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'DPDP_NOTICE';
