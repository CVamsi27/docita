-- CreateEnum
CREATE TYPE "Specialization" AS ENUM ('GENERAL_PRACTICE', 'DENTAL', 'CARDIOLOGY', 'PEDIATRICS', 'OPHTHALMOLOGY', 'DERMATOLOGY', 'ORTHOPEDICS', 'NEUROLOGY', 'GYNECOLOGY', 'ENT', 'PSYCHIATRY', 'UROLOGY', 'PULMONOLOGY', 'GASTROENTEROLOGY', 'ONCOLOGY', 'NEPHROLOGY', 'ENDOCRINOLOGY', 'RHEUMATOLOGY', 'RADIOLOGY', 'PATHOLOGY', 'ANESTHESIOLOGY', 'EMERGENCY_MEDICINE', 'FAMILY_MEDICINE', 'INTERNAL_MEDICINE', 'PLASTIC_SURGERY', 'GENERAL_SURGERY', 'OTHER');

-- CreateEnum
CREATE TYPE "HospitalRole" AS ENUM ('CONSULTANT', 'SENIOR_CONSULTANT', 'JUNIOR_DOCTOR', 'RESIDENT', 'INTERN', 'VISITING_DOCTOR', 'HEAD_OF_DEPARTMENT', 'MEDICAL_DIRECTOR', 'SURGEON', 'CHIEF_SURGEON', 'ATTENDING_PHYSICIAN', 'FELLOW');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "consultationFee" DOUBLE PRECISION,
ADD COLUMN     "hospitalRole" "HospitalRole",
ADD COLUMN     "licenseExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "specialization" "Specialization",
ADD COLUMN     "yearsOfExperience" INTEGER;

-- CreateTable
CREATE TABLE "DoctorEducation" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "institution" TEXT NOT NULL,
    "location" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isOngoing" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "thesis" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorCertification" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorSpecialization" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "specialization" "Specialization" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "certificationId" TEXT,
    "yearsOfPractice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorSpecialization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorEducation_doctorId_idx" ON "DoctorEducation"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorEducation_endYear_idx" ON "DoctorEducation"("endYear");

-- CreateIndex
CREATE INDEX "DoctorCertification_doctorId_idx" ON "DoctorCertification"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorCertification_expiryDate_idx" ON "DoctorCertification"("expiryDate");

-- CreateIndex
CREATE INDEX "DoctorSpecialization_doctorId_idx" ON "DoctorSpecialization"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorSpecialization_specialization_idx" ON "DoctorSpecialization"("specialization");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSpecialization_doctorId_specialization_key" ON "DoctorSpecialization"("doctorId", "specialization");

-- CreateIndex
CREATE INDEX "User_specialization_idx" ON "User"("specialization");

-- AddForeignKey
ALTER TABLE "DoctorEducation" ADD CONSTRAINT "DoctorEducation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorCertification" ADD CONSTRAINT "DoctorCertification_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialization" ADD CONSTRAINT "DoctorSpecialization_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
