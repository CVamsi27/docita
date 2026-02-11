-- Add version field for optimistic concurrency control
ALTER TABLE "Patient" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Create index for version-based queries
CREATE INDEX "Patient_version_idx" ON "Patient"("version");
