import { Patient, PatientOtp, User } from '@workspace/db';

export type PatientProfile = Pick<
  Patient,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'preferredName'
  | 'email'
  | 'phoneNumber'
  | 'dateOfBirth'
  | 'gender'
  | 'bloodGroup'
  | 'address'
  | 'mrn'
  | 'preferredLanguage'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelation'
  | 'whatsappConsent'
  | 'whatsappConsentAt'
  | 'createdAt'
>;

export type PatientSummary = Pick<
  Patient,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phoneNumber'
  | 'dateOfBirth'
  | 'gender'
  | 'bloodGroup'
  | 'mrn'
>;

export type PatientWithUser = Patient & { user: User | null };

export type OtpRecord = Pick<
  PatientOtp,
  | 'id'
  | 'phoneNumber'
  | 'otpHash'
  | 'expiresAt'
  | 'attempts'
  | 'usedAt'
  | 'createdAt'
>;

export interface IPatientPortalRepository {
  findPatientByUserId(userId: string): Promise<Patient | null>;

  findPatientByPhone(phone: string): Promise<Patient | null>;

  findPatientWithUserByPhone(phone: string): Promise<PatientWithUser | null>;

  getPatientSummary(patientId: string): Promise<PatientSummary | null>;

  getPatientProfile(patientId: string): Promise<PatientProfile | null>;

  updatePatient(
    patientId: string,
    data: Record<string, unknown>,
  ): Promise<PatientProfile>;

  getUpcomingAppointments(
    patientId: string,
    clinicId: string,
    from: Date,
    take: number,
  ): Promise<unknown[]>;

  getAppointments(
    patientId: string,
    clinicId: string,
    filters: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      take: number;
      skip: number;
    },
  ): Promise<{ items: unknown[]; total: number }>;

  getAppointmentById(
    appointmentId: string,
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null>;

  getPrescriptions(
    patientId: string,
    filters: { take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }>;

  getPrescriptionById(
    prescriptionId: string,
    patientId: string,
  ): Promise<unknown | null>;

  getInvoices(
    patientId: string,
    filters: { status?: string; take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }>;

  getActivePrescriptions(patientId: string, take: number): Promise<unknown[]>;

  getOutstandingInvoices(patientId: string, take: number): Promise<unknown[]>;

  invalidateOtps(phone: string): Promise<void>;

  createOtp(data: {
    phoneNumber: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpRecord>;

  findActiveOtp(phone: string, now: Date): Promise<OtpRecord | null>;

  incrementOtpAttempts(id: string): Promise<void>;

  markOtpUsed(id: string): Promise<void>;

  createPortalUser(data: {
    email: string;
    password: string;
    role: string;
    name: string;
  }): Promise<User>;

  linkUserToPatient(patientId: string, userId: string): Promise<void>;
}

export const PATIENT_PORTAL_REPOSITORY_TOKEN = Symbol(
  'IPatientPortalRepository',
);
