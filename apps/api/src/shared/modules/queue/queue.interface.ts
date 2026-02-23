/**
 * Queue Service Interface
 *
 * Abstraction for job queue processing.
 * Allows scheduling async tasks with retries, delays, etc.
 */

export interface QueueJobOptions {
  delay?: number; // Milliseconds
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  priority?: number;
  timeout?: number;
  removeOnComplete?: boolean;
}

export interface QueueJob<T = any> {
  id: string;
  name: string;
  data: T;
  progress: number;
  failedReason?: string;
  attemptsMade: number;
  timestamp: number;
}

export interface IQueueProvider {
  enqueue<T>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>>;
  process<T>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void>;
  getJob<T>(jobId: string): Promise<QueueJob<T> | null>;
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

/**
 * Job names for common tasks
 */
export enum JobNames {
  // Email jobs
  SEND_EMAIL = 'send-email',
  SEND_BULK_EMAIL = 'send-bulk-email',

  // SMS jobs
  SEND_SMS = 'send-sms',
  SEND_BULK_SMS = 'send-bulk-sms',

  // WhatsApp jobs
  SEND_WHATSAPP = 'send-whatsapp',

  // Document jobs
  GENERATE_INVOICE_PDF = 'generate-invoice-pdf',
  GENERATE_PRESCRIPTION_PDF = 'generate-prescription-pdf',

  // Notification jobs
  SEND_APPOINTMENT_REMINDER = 'send-appointment-reminder',
  SEND_PAYMENT_REMINDER = 'send-payment-reminder',

  // Data export jobs
  EXPORT_PATIENTS = 'export-patients',
  EXPORT_APPOINTMENTS = 'export-appointments',
  EXPORT_INVOICES = 'export-invoices',

  // Backup jobs
  DATABASE_BACKUP = 'database-backup',
  ARCHIVE_OLD_DATA = 'archive-old-data',

  // Scheduled jobs
  PROCESS_SUBSCRIPTION_RENEWALS = 'process-subscription-renewals',
  GENERATE_MONTHLY_REPORTS = 'generate-monthly-reports',
  SEND_SCHEDULED_REMINDERS = 'send-scheduled-reminders',
}

/**
 * Job data types
 */
export interface SendEmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  variables?: Record<string, any>;
}

export interface SendSmsJobData {
  phoneNumber: string;
  message: string;
}

export interface SendWhatsAppJobData {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
}

export interface GeneratePdfJobData {
  documentId: string;
  documentType: 'invoice' | 'prescription';
  clinicId: string;
}

export interface SendAppointmentReminderJobData {
  appointmentId: string;
  clinicId: string;
  patientId: string;
  hoursBeforeAppointment: number;
}
