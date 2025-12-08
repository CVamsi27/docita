-- CreateTable PaymentRetry
CREATE TABLE "PaymentRetry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayLinkId" TEXT,

    -- Retry Strategy
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3) NOT NULL,
    "retryIntervals" INTEGER[] NOT NULL DEFAULT ARRAY[3600, 86400, 259200],

    -- Status
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    -- Context
    "paymentMethod" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "phoneNumber" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for queries
CREATE INDEX "PaymentRetry_clinicId_idx" ON "PaymentRetry"("clinicId");
CREATE INDEX "PaymentRetry_status_idx" ON "PaymentRetry"("status");
CREATE INDEX "PaymentRetry_nextRetryAt_idx" ON "PaymentRetry"("nextRetryAt");
CREATE INDEX "PaymentRetry_invoiceId_idx" ON "PaymentRetry"("invoiceId");
CREATE INDEX "PaymentRetry_clinicId_status_idx" ON "PaymentRetry"("clinicId", "status");

-- AddForeignKey
ALTER TABLE "PaymentRetry" ADD CONSTRAINT "PaymentRetry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRetry" ADD CONSTRAINT "PaymentRetry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
