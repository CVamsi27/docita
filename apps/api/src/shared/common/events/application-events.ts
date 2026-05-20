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
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATION_BULK_DELETED = 'notification.bulk-deleted',
  WHATSAPP_MESSAGE_SENT = 'whatsapp.message.sent',
  OCR_PAGE_PROCESSED = 'ocr.page.processed',
}

export const APPLICATION_EVENT_NAMES = new Set<string>(
  Object.values(ApplicationEvents),
);
