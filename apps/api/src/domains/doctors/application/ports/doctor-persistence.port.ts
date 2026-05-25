import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type DoctorPersistenceKey =
  | 'clinic'
  | 'doctorCertification'
  | 'doctorClinic'
  | 'doctorEducation'
  | 'doctorSpecialization'
  | 'user';

export type DoctorPersistencePort = Pick<
  PrismaDelegatePort,
  DoctorPersistenceKey
>;

export const DOCTOR_PERSISTENCE_PORT = 'DoctorPersistencePort';
