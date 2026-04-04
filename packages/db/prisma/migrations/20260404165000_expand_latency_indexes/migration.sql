-- Expand phase: latency indexes and idempotency uniqueness.
-- Non-breaking additive changes only.

-- Guardrail: ensure no duplicate non-null invoice numbers exist before enforcing uniqueness.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SubscriptionPayment"
    WHERE "invoiceNumber" IS NOT NULL
    GROUP BY "clinicId", "invoiceNumber"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate (clinicId, invoiceNumber) rows detected in SubscriptionPayment; clean duplicates before applying uniqueness.';
  END IF;
END $$;

CREATE INDEX "Appointment_clinicId_startTime_id_idx" ON "Appointment"("clinicId", "startTime" DESC, "id" DESC);
CREATE INDEX "Appointment_patientId_clinicId_startTime_idx" ON "Appointment"("patientId", "clinicId", "startTime" DESC);
CREATE INDEX "Appointment_doctorId_clinicId_startTime_idx" ON "Appointment"("doctorId", "clinicId", "startTime" DESC);
CREATE INDEX "User_clinicId_role_createdAt_idx" ON "User"("clinicId", "role", "createdAt");
CREATE INDEX "Patient_phoneNumber_deletedAt_idx" ON "Patient"("phoneNumber", "deletedAt");
CREATE INDEX "Patient_userId_deletedAt_idx" ON "Patient"("userId", "deletedAt");
CREATE INDEX "RefreshToken_userId_revokedAt_expiresAt_lastUsedAt_idx" ON "RefreshToken"("userId", "revokedAt", "expiresAt", "lastUsedAt" DESC);
CREATE INDEX "StaffNotification_unread_priority_idx" ON "StaffNotification"("userId", "deletedAt", "isRead", "priority", "createdAt" DESC);
CREATE INDEX "SubscriptionReminder_clinicId_type_channel_createdAt_idx" ON "SubscriptionReminder"("clinicId", "type", "channel", "createdAt" DESC);
CREATE UNIQUE INDEX "SubscriptionPayment_clinicId_invoiceNumber_key" ON "SubscriptionPayment"("clinicId", "invoiceNumber");
