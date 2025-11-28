-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN_DOCTOR';

-- CreateTable
CREATE TABLE "IcdCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'ICD-10',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcdCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CptCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CptCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "icdCodeId" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "cptCodeId" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorFavoriteCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "icdCodeId" TEXT,
    "cptCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorFavoriteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IcdCode_code_key" ON "IcdCode"("code");

-- CreateIndex
CREATE INDEX "IcdCode_code_idx" ON "IcdCode"("code");

-- CreateIndex
CREATE INDEX "IcdCode_description_idx" ON "IcdCode"("description");

-- CreateIndex
CREATE INDEX "IcdCode_category_idx" ON "IcdCode"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CptCode_code_key" ON "CptCode"("code");

-- CreateIndex
CREATE INDEX "CptCode_code_idx" ON "CptCode"("code");

-- CreateIndex
CREATE INDEX "CptCode_description_idx" ON "CptCode"("description");

-- CreateIndex
CREATE INDEX "CptCode_category_idx" ON "CptCode"("category");

-- CreateIndex
CREATE INDEX "Diagnosis_appointmentId_idx" ON "Diagnosis"("appointmentId");

-- CreateIndex
CREATE INDEX "Diagnosis_icdCodeId_idx" ON "Diagnosis"("icdCodeId");

-- CreateIndex
CREATE INDEX "Procedure_appointmentId_idx" ON "Procedure"("appointmentId");

-- CreateIndex
CREATE INDEX "Procedure_cptCodeId_idx" ON "Procedure"("cptCodeId");

-- CreateIndex
CREATE INDEX "DoctorFavoriteCode_userId_idx" ON "DoctorFavoriteCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorFavoriteCode_userId_icdCodeId_key" ON "DoctorFavoriteCode"("userId", "icdCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorFavoriteCode_userId_cptCodeId_key" ON "DoctorFavoriteCode"("userId", "cptCodeId");

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_icdCodeId_fkey" FOREIGN KEY ("icdCodeId") REFERENCES "IcdCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_cptCodeId_fkey" FOREIGN KEY ("cptCodeId") REFERENCES "CptCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFavoriteCode" ADD CONSTRAINT "DoctorFavoriteCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFavoriteCode" ADD CONSTRAINT "DoctorFavoriteCode_icdCodeId_fkey" FOREIGN KEY ("icdCodeId") REFERENCES "IcdCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFavoriteCode" ADD CONSTRAINT "DoctorFavoriteCode_cptCodeId_fkey" FOREIGN KEY ("cptCodeId") REFERENCES "CptCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
