-- CreateEnum
CREATE TYPE "SupportInquiryStatus" AS ENUM ('NEW', 'REVIEWED', 'RESOLVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "SupportInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clinic" TEXT,
    "message" TEXT NOT NULL,
    "status" "SupportInquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "internalNotes" TEXT,

    CONSTRAINT "SupportInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportInquiry_status_idx" ON "SupportInquiry"("status");

-- CreateIndex
CREATE INDEX "SupportInquiry_createdAt_idx" ON "SupportInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "SupportInquiry_email_idx" ON "SupportInquiry"("email");
