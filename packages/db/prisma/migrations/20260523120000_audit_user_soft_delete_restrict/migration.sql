-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- DropForeignKey
ALTER TABLE "NotificationPreferences" DROP CONSTRAINT "NotificationPreferences_userId_fkey";

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "MemberJoinRequest" DROP CONSTRAINT "MemberJoinRequest_userId_fkey";

-- AddForeignKey
ALTER TABLE "MemberJoinRequest" ADD CONSTRAINT "MemberJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "DoctorEducation" DROP CONSTRAINT "DoctorEducation_doctorId_fkey";

-- AddForeignKey
ALTER TABLE "DoctorEducation" ADD CONSTRAINT "DoctorEducation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "AppointmentRequest_clinicId_status_preferredDate_idx" ON "AppointmentRequest"("clinicId", "status", "preferredDate");
