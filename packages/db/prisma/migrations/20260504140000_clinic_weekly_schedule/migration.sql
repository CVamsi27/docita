-- CreateTable
CREATE TABLE "ClinicWeeklySchedule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicWeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicWeeklySchedule_clinicId_idx" ON "ClinicWeeklySchedule"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicWeeklySchedule_clinicId_dayOfWeek_isActive_idx" ON "ClinicWeeklySchedule"("clinicId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicWeeklySchedule_clinicId_dayOfWeek_key" ON "ClinicWeeklySchedule"("clinicId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "ClinicWeeklySchedule" ADD CONSTRAINT "ClinicWeeklySchedule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
