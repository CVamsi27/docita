-- CreateTable
CREATE TABLE "FeatureFlagDefinition" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "clinicOverrides" JSONB,
    "userOverrides" JSONB,
    "percentageRollout" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlagDefinition_pkey" PRIMARY KEY ("key")
);
