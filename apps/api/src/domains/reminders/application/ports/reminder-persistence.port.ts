import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type ReminderPersistenceKey =
  | 'clinic'
  | 'appointment'
  | 'appointmentReminder'
  | 'reminderSettings'
  | 'runUnrestricted'
  | 'whatsappLog';

export type ReminderPersistencePort = Pick<
  PrismaDelegatePort,
  ReminderPersistenceKey | '$transaction'
>;

export const REMINDER_PERSISTENCE_PORT = 'ReminderPersistencePort';
