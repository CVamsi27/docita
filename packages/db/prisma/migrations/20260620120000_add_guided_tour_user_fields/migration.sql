-- CreateEnum
CREATE TYPE "GuidedTourStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guidedTourStatus" "GuidedTourStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "guidedTourLastStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guidedTourCompletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "checklistDismissedAt" TIMESTAMPTZ(3);

-- Register the `guided_tour` feature flag definition (default OFF) so the frontend
-- `/feature-flags/me` resolver (FeatureFlagDefinition-backed) returns it. Idempotent:
-- a later runtime upsert via `PUT /feature-flags/guided_tour` or a re-run is safe.
INSERT INTO "FeatureFlagDefinition" ("key", "description", "defaultEnabled", "updatedAt")
VALUES ('guided_tour', 'Guided onboarding checklist + welcome tour on /today', false, NOW())
ON CONFLICT ("key") DO NOTHING;
