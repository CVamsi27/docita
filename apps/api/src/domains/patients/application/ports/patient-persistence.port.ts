import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type PatientPersistenceKey =
  | 'patientAllergy'
  | 'patientFamilyHistory'
  | 'patientMedicalCondition'
  | 'patientSocialHistory'
  | 'patientSurgicalHistory'
  | 'prescription';

export type PatientPersistencePort = Pick<
  PrismaDelegatePort,
  PatientPersistenceKey
>;

export const PATIENT_PERSISTENCE_PORT = 'PatientPersistencePort';
