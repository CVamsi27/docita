-- CreateEnum
CREATE TYPE "MedicationDoseStatus" AS ENUM ('PENDING', 'TAKEN', 'MISSED', 'SKIPPED', 'ADMINISTERED');

-- CreateEnum
CREATE TYPE "MedicationDoseSource" AS ENUM ('PATIENT_REPORTED', 'CLINICIAN_RECORDED', 'PHARMACY_CONFIRMED', 'SYSTEM_GENERATED');

-- CreateTable
CREATE TABLE "MedicationDose" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "takenAt" TIMESTAMP(3),
    "status" "MedicationDoseStatus" NOT NULL DEFAULT 'PENDING',
    "doseAmount" TEXT,
    "route" TEXT,
    "administeredBy" TEXT,
    "notes" TEXT,
    "source" "MedicationDoseSource" NOT NULL DEFAULT 'SYSTEM_GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationDose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationDose_patientId_scheduledAt_idx" ON "MedicationDose"("patientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "MedicationDose_medicationId_idx" ON "MedicationDose"("medicationId");

-- CreateIndex
CREATE INDEX "MedicationDose_prescriptionId_idx" ON "MedicationDose"("prescriptionId");

-- CreateIndex
CREATE INDEX "MedicationDose_clinicId_patientId_idx" ON "MedicationDose"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "MedicationDose_status_idx" ON "MedicationDose"("status");

-- AddForeignKey
ALTER TABLE "MedicationDose" ADD CONSTRAINT "MedicationDose_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDose" ADD CONSTRAINT "MedicationDose_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDose" ADD CONSTRAINT "MedicationDose_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestOrder" ADD CONSTRAINT "LabTestOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
