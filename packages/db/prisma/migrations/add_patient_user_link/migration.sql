-- AlterTable: Add optional userId to Patient table to link Patient to User account
ALTER TABLE "Patient" ADD COLUMN "userId" TEXT;

-- CreateIndex: Unique index on Patient.userId (one patient = one user)
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- AddForeignKey: Link Patient.userId to User.id
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
