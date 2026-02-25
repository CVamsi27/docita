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
}

export interface QueueJob<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  name: string;
  data: T;
  progress: number;
  failedReason?: string;
  attemptsMade: number;
  timestamp: number;
}

export interface IQueueProvider {
  enqueue<T extends Record<string, unknown>>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>>;
  process<T extends Record<string, unknown>>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void>;
  getJob<T extends Record<string, unknown>>(
    jobId: string,
  ): Promise<QueueJob<T> | null>;
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

export interface SendEmailJobData extends Record<string, unknown> {
  to: string | string[];
  subject: string;
  template: string;
  variables?: Record<string, unknown>;
}

export interface SendSmsJobData extends Record<string, unknown> {
  phoneNumber: string;
  message: string;
}

export interface SendWhatsAppJobData extends Record<string, unknown> {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
}

export interface GeneratePdfJobData extends Record<string, unknown> {
  documentId: string;
  documentType: 'invoice' | 'prescription';
  clinicId: string;
}

export interface SendAppointmentReminderJobData extends Record<
  string,
  unknown
> {
  appointmentId: string;
  clinicId: string;
  patientId: string;
  hoursBeforeAppointment: number;
}
