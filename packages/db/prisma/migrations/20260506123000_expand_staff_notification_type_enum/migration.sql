-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "StaffNotificationType" ADD VALUE 'APPOINTMENT_REQUEST_CREATED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'APPOINTMENT_REQUEST_APPROVED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'APPOINTMENT_REQUEST_REJECTED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'APPOINTMENT_RESCHEDULED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'APPOINTMENT_NO_SHOW';
ALTER TYPE "StaffNotificationType" ADD VALUE 'APPOINTMENT_CONFIRMED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'PRESCRIPTION_SENT';
ALTER TYPE "StaffNotificationType" ADD VALUE 'PRESCRIPTION_FAILED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'INVOICE_SENT';
ALTER TYPE "StaffNotificationType" ADD VALUE 'INVOICE_FAILED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_DUE_SOON';
ALTER TYPE "StaffNotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_OVERDUE';
ALTER TYPE "StaffNotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_SUCCESS';
ALTER TYPE "StaffNotificationType" ADD VALUE 'SUBSCRIPTION_PAYMENT_FAILED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'PAYMENT_PROVIDER_STATUS_UPDATE';
ALTER TYPE "StaffNotificationType" ADD VALUE 'CONSULTATION_STARTED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'CONSULTATION_SIGNED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'CONSULTATION_PENDING_ACTION';

