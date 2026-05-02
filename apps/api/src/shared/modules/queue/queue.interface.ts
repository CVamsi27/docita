import { Prisma } from '@workspace/db';

export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  priority?: number;
  timeout?: number;
  removeOnComplete?: boolean;
  /**
   * Optional client-provided key. If a job with the same `name` +
   * `idempotencyKey` was COMPLETED in the last 24h the new enqueue
   * short-circuits and returns the original job instead of running again.
   * Callers should synthesise from a domain id + action when they don't
   * receive one (e.g. `whatsapp:send:${messageId}`).
   */
  idempotencyKey?: string;
}

export type QueueJobData = Prisma.InputJsonObject;

export interface QueueJob<T extends QueueJobData = QueueJobData> {
  id: string;
  name: string;
  data: T;
  progress: number;
  failedReason?: string;
  attemptsMade: number;
  maxAttempts?: number;
  timestamp: number;
}

export type QueueJobHandler<T extends QueueJobData = QueueJobData> = (
  job: QueueJob<T>,
) => Promise<void>;

export interface IQueueProvider {
  enqueue<T extends QueueJobData>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>>;
  process<T extends QueueJobData>(
    name: string,
    handler: QueueJobHandler<T>,
  ): Promise<void>;
  getJob<T extends QueueJobData>(jobId: string): Promise<QueueJob<T> | null>;
  removeJob(jobId: string): Promise<void>;
  clear(name: string): Promise<void>;
  getStats(name: string): Promise<QueueStats>;
}

export interface QueueStats {
  processed: number;
  failed: number;
  waiting: number;
  active: number;
  delayed: number;
}

export enum JobNames {
  SEND_EMAIL = 'send-email',
  SEND_BULK_EMAIL = 'send-bulk-email',
  SEND_SMS = 'send-sms',
  SEND_BULK_SMS = 'send-bulk-sms',
  SEND_WHATSAPP = 'send-whatsapp',
  GENERATE_INVOICE_PDF = 'generate-invoice-pdf',
  GENERATE_PRESCRIPTION_PDF = 'generate-prescription-pdf',
  SEND_APPOINTMENT_REMINDER = 'send-appointment-reminder',
  SEND_PAYMENT_REMINDER = 'send-payment-reminder',
  EXPORT_PATIENTS = 'export-patients',
  EXPORT_APPOINTMENTS = 'export-appointments',
  EXPORT_INVOICES = 'export-invoices',
  DATABASE_BACKUP = 'database-backup',
  ARCHIVE_OLD_DATA = 'archive-old-data',
  PROCESS_SUBSCRIPTION_RENEWALS = 'process-subscription-renewals',
  GENERATE_MONTHLY_REPORTS = 'generate-monthly-reports',
  SEND_SCHEDULED_REMINDERS = 'send-scheduled-reminders',
}

export interface SendEmailJobData extends Prisma.InputJsonObject {
  to: string | string[];
  subject: string;
  template: string;
  variables?: Prisma.InputJsonObject;
}

export interface SendSmsJobData extends Prisma.InputJsonObject {
  phoneNumber: string;
  message: string;
}

export interface SendWhatsAppJobData extends Prisma.InputJsonObject {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
}

export interface GeneratePdfJobData extends Prisma.InputJsonObject {
  documentId: string;
  documentType: 'invoice' | 'prescription';
  clinicId: string;
  pdfJobId?: string;
}

export interface SendAppointmentReminderJobData extends Prisma.InputJsonObject {
  appointmentId: string;
  clinicId: string;
  patientId: string;
  hoursBeforeAppointment: number;
}
