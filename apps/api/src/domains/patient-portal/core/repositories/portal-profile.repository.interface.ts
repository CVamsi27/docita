import { Patient } from '@workspace/db';
import type {
  PatientProfile,
  PatientSummary,
  PatientWithUser,
} from './portal-patient.types';

export interface IPortalProfileRepository {
  runUnrestricted<T>(operation: () => Promise<T>): Promise<T>;

  findPatientByUserId(userId: string): Promise<Patient | null>;

  findPatientByPhone(phone: string): Promise<Patient | null>;

  findPatientWithUserByPhone(phone: string): Promise<PatientWithUser | null>;

  getPatientSummary(patientId: string): Promise<PatientSummary | null>;

  getPatientProfile(patientId: string): Promise<PatientProfile | null>;

  hasActiveTreatmentConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean>;

  updatePatient(
    patientId: string,
    data: Record<string, unknown>,
  ): Promise<PatientProfile>;

  linkUserToPatient(patientId: string, userId: string): Promise<void>;
}

export const PORTAL_PROFILE_REPOSITORY_TOKEN = Symbol(
  'IPortalProfileRepository',
);
