-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-IN',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
