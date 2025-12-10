-- AlterTable Prescription: Add doctor context snapshot fields for audit trail
ALTER TABLE "Prescription" ADD COLUMN "doctorName" TEXT,
ADD COLUMN "doctorEmail" TEXT,
ADD COLUMN "doctorPhone" TEXT,
ADD COLUMN "doctorSpecialization" TEXT,
ADD COLUMN "doctorRole" TEXT,
ADD COLUMN "doctorRegistrationNumber" TEXT,
ADD COLUMN "doctorLicenseNumber" TEXT;

-- AlterTable Invoice: Add doctor context snapshot fields for audit trail
ALTER TABLE "Invoice" ADD COLUMN "doctorName" TEXT,
ADD COLUMN "doctorEmail" TEXT,
ADD COLUMN "doctorPhone" TEXT,
ADD COLUMN "doctorSpecialization" TEXT,
ADD COLUMN "doctorRole" TEXT,
ADD COLUMN "doctorRegistrationNumber" TEXT,
ADD COLUMN "doctorLicenseNumber" TEXT;
