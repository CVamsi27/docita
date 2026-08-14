import { Patient } from '@workspace/db';
import type { DataSubjectRequestType } from '@workspace/db';
import type {
  PatientProfile,
  PatientSummary,
  PatientWithUser,
} from './portal-patient.types';

/** Patient-initiated DPDP data-subject request (portal channel). */
export interface PortalDataSubjectRequestInput {
  clinicId: string;
  patientId: string;
  requestType: Extract<DataSubjectRequestType, 'DELETION' | 'EXPORT'>;
  requestDetails?: string;
  dueAt: Date;
}

export interface IPortalProfileRepository {
  runUnrestricted<T>(operation: () => Promise<T>): Promise<T>;

  findPatientByUserId(userId: string): Promise<Patient | null>;

  findPatientByPhone(phone: string): Promise<Patient | null>;

  findPatientWithUserByPhone(phone: string): Promise<PatientWithUser | null>;

  getPatientSummary(patientId: string): Promise<PatientSummary | null>;

  getPatientProfile(patientId: string): Promise<PatientProfile | null>;

  updatePatient(
    patientId: string,
    data: Record<string, unknown>,
  ): Promise<PatientProfile>;

  linkUserToPatient(patientId: string, userId: string): Promise<void>;

  /**
   * Records a patient-initiated data-subject request so it lands in the
   * clinic's compliance queue (Settings → Compliance → Patient rights).
   */
  createDataSubjectRequest(
    input: PortalDataSubjectRequestInput,
  ): Promise<{ id: string; dueAt: Date | null }>;
}

export const PORTAL_PROFILE_REPOSITORY_TOKEN = Symbol(
  'IPortalProfileRepository',
);
