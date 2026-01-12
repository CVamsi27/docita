/**
 * Domain Events for Docita
 *
 * These events enable loose coupling between modules.
 * Modules can subscribe to events without direct dependencies.
 */

// ============================================================================
// Event Types
// ============================================================================

export enum DomainEvents {
  // Patient Events
  PATIENT_CREATED = 'patient.created',
  PATIENT_UPDATED = 'patient.updated',
  PATIENT_DELETED = 'patient.deleted',
  PATIENT_MERGED = 'patient.merged',

  // Appointment Events
  APPOINTMENT_SCHEDULED = 'appointment.scheduled',
  APPOINTMENT_RESCHEDULED = 'appointment.rescheduled',
  APPOINTMENT_STARTED = 'appointment.started',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_NO_SHOW = 'appointment.no_show',

  // Prescription Events
  PRESCRIPTION_CREATED = 'prescription.created',
  PRESCRIPTION_UPDATED = 'prescription.updated',
  PRESCRIPTION_SENT = 'prescription.sent',
  PRESCRIPTION_VIEWED = 'prescription.viewed',

  // Invoice Events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_OVERDUE = 'invoice.overdue',

  // Document Events
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_SHARED = 'document.shared',

  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',

  // Clinic Events
  CLINIC_CREATED = 'clinic.created',
  CLINIC_UPDATED = 'clinic.updated',
  CLINIC_SUBSCRIPTION_CHANGED = 'clinic.subscription_changed',

  // Communication Events
  WHATSAPP_SENT = 'whatsapp.sent',
  WHATSAPP_DELIVERED = 'whatsapp.delivered',
  WHATSAPP_READ = 'whatsapp.read',
  WHATSAPP_FAILED = 'whatsapp.failed',
  WHATSAPP_INCOMING = 'whatsapp.incoming',

  // Queue Events
  QUEUE_TOKEN_CREATED = 'queue.token_created',
  QUEUE_TOKEN_CALLED = 'queue.token_called',
  QUEUE_TOKEN_COMPLETED = 'queue.token_completed',
  QUEUE_TOKEN_SKIPPED = 'queue.token_skipped',

  // Reminder Events
  REMINDER_SCHEDULED = 'reminder.scheduled',
  REMINDER_SENT = 'reminder.sent',
  REMINDER_FAILED = 'reminder.failed',

  // Analytics Events
  ANALYTICS_SNAPSHOT_CREATED = 'analytics.snapshot_created',
  REPORT_GENERATED = 'report.generated',

  // System Events
  SYSTEM_HEALTH_CHECK = 'system.health_check',
  SYSTEM_ERROR = 'system.error',
  MIGRATION_STARTED = 'migration.started',
  MIGRATION_COMPLETED = 'migration.completed',
  MIGRATION_FAILED = 'migration.failed',
}

// ============================================================================
// Event Metadata
// ============================================================================

export interface EventMetadata {
  /** Clinic context for the event */
  clinicId: string;
  /** User who triggered the event */
  userId?: string;
  /** Timestamp of the event */
  timestamp: Date;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Source module that emitted the event */
  source: string;
  /** Event version for schema evolution */
  version: number;
}

// ============================================================================
// Base Event Interface
// ============================================================================

export interface DomainEvent<T = unknown> {
  /** Event type from DomainEvents enum */
  type: DomainEvents;
  /** Event payload specific to the event type */
  payload: T;
  /** Event metadata */
  metadata: EventMetadata;
}

// ============================================================================
// Event Payloads
// ============================================================================

// Patient Events
export interface PatientCreatedPayload {
  patientId: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface PatientUpdatedPayload {
  patientId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface PatientDeletedPayload {
  patientId: string;
  mrn?: string;
  reason?: string;
}

// Appointment Events
export interface AppointmentScheduledPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  type: string;
}

export interface AppointmentCompletedPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  duration: number;
  hasPrescription: boolean;
  hasInvoice: boolean;
}

export interface AppointmentCancelledPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  reason?: string;
  cancelledBy: string;
}

// Prescription Events
export interface PrescriptionCreatedPayload {
  prescriptionId: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  medicationCount: number;
}

export interface PrescriptionSentPayload {
  prescriptionId: string;
  patientId: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipientPhone?: string;
  recipientEmail?: string;
}

// Invoice Events
export interface InvoiceCreatedPayload {
  invoiceId: string;
  appointmentId?: string;
  patientId: string;
  totalAmount: number;
  currency: string;
}

export interface InvoicePaidPayload {
  invoiceId: string;
  patientId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
}

// WhatsApp Events
export interface WhatsAppSentPayload {
  messageId: string;
  patientId?: string;
  to: string;
  templateName?: string;
  messageType: 'template' | 'text' | 'media';
}

export interface WhatsAppIncomingPayload {
  messageId: string;
  from: string;
  patientId?: string;
  body: string;
  timestamp: Date;
}

// System Events
export interface SystemErrorPayload {
  error: string;
  stack?: string;
  context: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Event Type Mapping
// ============================================================================

export type EventPayloadMap = {
  [DomainEvents.PATIENT_CREATED]: PatientCreatedPayload;
  [DomainEvents.PATIENT_UPDATED]: PatientUpdatedPayload;
  [DomainEvents.PATIENT_DELETED]: PatientDeletedPayload;
  [DomainEvents.APPOINTMENT_SCHEDULED]: AppointmentScheduledPayload;
  [DomainEvents.APPOINTMENT_COMPLETED]: AppointmentCompletedPayload;
  [DomainEvents.APPOINTMENT_CANCELLED]: AppointmentCancelledPayload;
  [DomainEvents.PRESCRIPTION_CREATED]: PrescriptionCreatedPayload;
  [DomainEvents.PRESCRIPTION_SENT]: PrescriptionSentPayload;
  [DomainEvents.INVOICE_CREATED]: InvoiceCreatedPayload;
  [DomainEvents.INVOICE_PAID]: InvoicePaidPayload;
  [DomainEvents.WHATSAPP_SENT]: WhatsAppSentPayload;
  [DomainEvents.WHATSAPP_INCOMING]: WhatsAppIncomingPayload;
  [DomainEvents.SYSTEM_ERROR]: SystemErrorPayload;
};

// ============================================================================
// Type-Safe Event Creation
// ============================================================================

export function createEvent<T extends DomainEvents>(
  type: T,
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown,
  metadata: Omit<EventMetadata, 'timestamp' | 'version'> & {
    timestamp?: Date;
    version?: number;
  },
): DomainEvent<T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown> {
  return {
    type,
    payload,
    metadata: {
      ...metadata,
      timestamp: metadata.timestamp ?? new Date(),
      version: metadata.version ?? 1,
    },
  };
}
