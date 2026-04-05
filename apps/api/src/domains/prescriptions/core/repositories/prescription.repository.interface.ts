import { Prescription, Prisma } from '@workspace/db';

export interface PrescriptionSearchParams {
  clinicId: string;
  search?: string;
  date?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export interface PrescriptionDetail extends Prescription {
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    route: string | null;
    frequency: string;
    duration: string;
  }>;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
    gender: string;
    dateOfBirth: Date;
    clinic: {
      id: string;
      name: string;
      email: string | null;
      phoneNumber: string | null;
      address: string | null;
      logo: string | null;
      currency: string | null;
      branding: unknown;
    };
  };
  doctor?: {
    id: string;
    name: string;
    qualification: string | null;
    registrationNumber: string | null;
    signatureUrl: string | null;
  };
  appointment?: {
    diagnoses: Array<{
      isPrimary: boolean;
      icdCode: { code: string; description: string; version: string } | null;
    }>;
  };
}

export interface PatientWithAllergies {
  id: string;
  patientAllergies: Array<{
    allergen: string;
    allergyType: string;
    severity: string;
    reaction: string | null;
  }>;
}

export interface DoctorComplianceProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  registrationNumber: string | null;
  licenseNumber: string | null;
  signatureUrl: string | null;
  verificationStatus:
    | 'UNVERIFIED'
    | 'PENDING'
    | 'VERIFIED'
    | 'REJECTED'
    | 'FAILED';
}

export interface IPrescriptionRepository {
  findAll(
    params: PrescriptionSearchParams,
  ): Promise<Prescription[] | PaginatedResult<Prescription>>;
  findById(id: string): Promise<PrescriptionDetail | null>;
  create(data: Prisma.PrescriptionCreateInput): Promise<Prescription>;
  update(
    id: string,
    data: Prisma.PrescriptionUpdateInput,
  ): Promise<Prescription>;
  delete(id: string): Promise<void>;
  findPatientWithAllergies(
    patientId: string,
  ): Promise<PatientWithAllergies | null>;
  findDoctorCompliance(
    doctorId: string,
    clinicId?: string,
  ): Promise<DoctorComplianceProfile | null>;
}
