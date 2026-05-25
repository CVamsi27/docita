-- Add originalStartTime to Appointment for audit trail
ALTER TABLE "Appointment" ADD COLUMN "originalStartTime" TIMESTAMP(3);

-- CreateTable DoctorDelay
CREATE TABLE "DoctorDelay" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "markedById" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedById" TEXT,

    CONSTRAINT "DoctorDelay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorDelay_clinicId_isActive_idx" ON "DoctorDelay"("clinicId", "isActive");

-- CreateIndex
CREATE INDEX "DoctorDelay_doctorId_isActive_idx" ON "DoctorDelay"("doctorId", "isActive");

-- CreateIndex
CREATE INDEX "DoctorDelay_markedAt_idx" ON "DoctorDelay"("markedAt");
