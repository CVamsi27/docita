-- Adds HOSPITAL value to ClinicTier enum (additive only, no row changes).
-- Positioned between PROFESSIONAL and ENTERPRISE on UI rank, but Postgres
-- enum order is irrelevant to billing logic which uses tier names.
ALTER TYPE "ClinicTier" ADD VALUE IF NOT EXISTS 'HOSPITAL';
