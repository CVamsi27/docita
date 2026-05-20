import type { IPortalAppointmentsRepository } from './portal-appointments.repository.interface';
import type { IPortalAuthRepository } from './portal-auth.repository.interface';
import type { IPortalDocumentsRepository } from './portal-documents.repository.interface';
import type { IPortalProfileRepository } from './portal-profile.repository.interface';

export type {
  OtpRecord,
  PatientProfile,
  PatientSummary,
  PatientWithUser,
} from './portal-patient.types';

export type { IPortalProfileRepository } from './portal-profile.repository.interface';
export {
  PORTAL_PROFILE_REPOSITORY_TOKEN,
} from './portal-profile.repository.interface';
export type { IPortalAuthRepository } from './portal-auth.repository.interface';
export { PORTAL_AUTH_REPOSITORY_TOKEN } from './portal-auth.repository.interface';
export type { IPortalAppointmentsRepository } from './portal-appointments.repository.interface';
export {
  PORTAL_APPOINTMENTS_REPOSITORY_TOKEN,
} from './portal-appointments.repository.interface';
export type { IPortalDocumentsRepository } from './portal-documents.repository.interface';
export {
  PORTAL_DOCUMENTS_REPOSITORY_TOKEN,
} from './portal-documents.repository.interface';

/** Composite port for callers that span profile, auth, appointments, and documents. */
export interface IPatientPortalRepository
  extends IPortalProfileRepository,
    IPortalAuthRepository,
    IPortalAppointmentsRepository,
    IPortalDocumentsRepository {}

export const PATIENT_PORTAL_REPOSITORY_TOKEN = Symbol(
  'IPatientPortalRepository',
);
