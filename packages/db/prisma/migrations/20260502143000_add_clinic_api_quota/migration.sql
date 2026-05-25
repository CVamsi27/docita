-- CreateTable
CREATE TABLE "ClinicApiQuota" (
    "clinicId" TEXT NOT NULL,
    "rps" INTEGER NOT NULL DEFAULT 50,
    "rpm" INTEGER NOT NULL DEFAULT 5000,
    "monthlyBudget" INTEGER NOT NULL DEFAULT 5000000,
    "currentMonthUsed" INTEGER NOT NULL DEFAULT 0,
    "currentMonthResetsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicApiQuota_pkey" PRIMARY KEY ("clinicId")
);

-- CreateIndex
CREATE INDEX "ClinicApiQuota_currentMonthResetsAt_idx" ON "ClinicApiQuota"("currentMonthResetsAt");

-- AddForeignKey
ALTER TABLE "ClinicApiQuota" ADD CONSTRAINT "ClinicApiQuota_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
