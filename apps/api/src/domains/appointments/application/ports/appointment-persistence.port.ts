import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type AppointmentPersistenceKey =
  | '$transaction'
  | 'appointment'
  | 'clinic'
  | 'diagnosis'
  | 'metricCategory'
  | 'metricDefinition'
  | 'patientMetricRecord'
  | 'vitalSign';

export type AppointmentPersistencePort = Pick<
  PrismaDelegatePort,
  AppointmentPersistenceKey
>;

export const APPOINTMENT_PERSISTENCE_PORT = 'AppointmentPersistencePort';
