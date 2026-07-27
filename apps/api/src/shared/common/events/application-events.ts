/**
 * NestJS EventEmitter2 channel names for cross-module integration (payloads vary).
 * Use with @OnEvent / EventEmitter2.emit instead of string literals.
 * Envelope-typed bus events use {@link DomainEvents} via DomainEventService.
 */
export enum ApplicationEvents {
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_UPDATED = 'appointment.updated',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  DOCTOR_DELAY_MARKED = 'doctor-delay.marked',
  PRESCRIPTION_CREATED = 'prescription.created',
  INVOICE_GENERATED = 'invoice.generated',
  PAYMENT_CAPTURED = 'payment.captured',
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATION_BULK_DELETED = 'notification.bulk-deleted',
  WHATSAPP_MESSAGE_SENT = 'whatsapp.message.sent',
  OCR_PAGE_PROCESSED = 'ocr.page.processed',
  AI_CREDITS_CONSUMED = 'ai.credits.consumed',
  WHATSAPP_DELIVERY_STALE = 'whatsapp.delivery.stale',
  // Emitted by clinics.onboarding after the onboarding transaction commits.
  // Subscriptions subscribes to capture any referrer code from
  // planSelection.referralCode (cross-domain integration without a direct
  // clinics.application → subscriptions.core.services import).
  CLINIC_ONBOARDED = 'clinic.onboarded',
  // Emitted by internal-referral.service after a Referrer is created. The
  // welcome pipeline (ReferrerWelcomeService) subscribes to this to render
  // the showcase PDF, upload it, and send the WABA welcome template.
  REFERRER_CREATED = 'referrer.created',
}
