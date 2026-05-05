-- AlterTable
ALTER TABLE "AppointmentRequest" ADD COLUMN     "requestedSlotStart" TIMESTAMP(3),
ADD COLUMN     "requestedSlotEnd" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PublicBookingOtp" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicBookingOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicBookingOtp_clinicId_phoneNumber_expiresAt_idx" ON "PublicBookingOtp"("clinicId", "phoneNumber", "expiresAt");

-- AddForeignKey
ALTER TABLE "PublicBookingOtp" ADD CONSTRAINT "PublicBookingOtp_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
