-- CreateTable
CREATE TABLE "ConsentTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "consentType" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentTemplate_clinicId_idx" ON "ConsentTemplate"("clinicId");

-- CreateIndex
CREATE INDEX "ConsentTemplate_consentType_idx" ON "ConsentTemplate"("consentType");

-- CreateIndex
CREATE INDEX "ConsentTemplate_isActive_idx" ON "ConsentTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplate_clinicId_consentType_version_key" ON "ConsentTemplate"("clinicId", "consentType", "version");
