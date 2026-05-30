import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type ClinicPersistenceKey =
  | '$transaction'
  | 'clinic'
  | 'consentTemplate'
  | 'dataSubjectRequest'
  | 'doctorClinic'
  | 'onboardingSession'
  | 'patient'
  | 'runUnrestricted'
  | 'subscription'
  | 'subscriptionPayment'
  | 'uploadSession'
  | 'user';

export type ClinicPersistencePort = Pick<
  PrismaDelegatePort,
  ClinicPersistenceKey
>;

export const CLINIC_PERSISTENCE_PORT = 'ClinicPersistencePort';
