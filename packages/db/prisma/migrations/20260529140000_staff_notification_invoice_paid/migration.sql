-- Add staff inbox type for patient invoice payments (Razorpay / payment link capture).
ALTER TYPE "StaffNotificationType" ADD VALUE IF NOT EXISTS 'INVOICE_PAID';
