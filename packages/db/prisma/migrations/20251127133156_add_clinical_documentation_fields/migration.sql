-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "clinicalImpression" TEXT,
ADD COLUMN     "differentialDiagnosis" TEXT,
ADD COLUMN     "finalDiagnosis" TEXT,
ADD COLUMN     "followUpPlan" TEXT,
ADD COLUMN     "generalExamination" JSONB,
ADD COLUMN     "historyOfPresentIllness" TEXT,
ADD COLUMN     "investigations" JSONB,
ADD COLUMN     "pastMedicalHistory" TEXT,
ADD COLUMN     "provisionalDiagnosis" TEXT,
ADD COLUMN     "reviewOfSystems" TEXT,
ADD COLUMN     "systemicExamination" JSONB,
ADD COLUMN     "treatmentPlan" TEXT;

-- AlterTable
ALTER TABLE "VitalSign" ADD COLUMN     "bloodGlucose" DOUBLE PRECISION,
ADD COLUMN     "bmi" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "painScore" INTEGER,
ADD COLUMN     "respiratoryRate" INTEGER;
