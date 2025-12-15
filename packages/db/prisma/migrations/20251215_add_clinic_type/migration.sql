-- Add the type column to Clinic table if it doesn't exist
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "type" VARCHAR(255) NOT NULL DEFAULT 'GENERAL';
