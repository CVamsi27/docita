-- AlterTable: Add optional userId to Patient table to link Patient to User account
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex: Unique index on Patient.userId (one patient = one user)
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_userId_key" ON "Patient"("userId");

-- AddForeignKey: Link Patient.userId to User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_userId_fkey'
  ) THEN
    ALTER TABLE "Patient"
      ADD CONSTRAINT "Patient_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
