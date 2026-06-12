import { Role, Specialization } from '@workspace/db';

export interface CreateDoctorUserInput {
  email: string;
  hashedPassword: string;
  name: string;
  clinicId: string;
  role: Role;
  specialization?: Specialization;
  hospitalRole?: import('@workspace/db').HospitalRole | null;
  qualification?: string | null;
  registrationNumber?: string | null;
  licenseNumber?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  consultationFee?: number | null;
}

export interface CreatedDoctorUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  specialization: Specialization | null;
  hospitalRole: string | null;
  qualification: string | null;
}

export interface DoctorClinicLink {
  doctorId: string;
  clinicId: string;
  role: Role | string;
}

export interface DoctorAfterUpdate {
  id: string;
  email: string;
  name: string;
  role: Role;
  specialization: Specialization | null;
  hospitalRole: string | null;
  qualification: string | null;
  registrationNumber: string | null;
  registrationCouncil: string | null;
  registrationStateCode: string | null;
  hprId: string | null;
  licenseNumber: string | null;
  signatureUrl: string | null;
  signatureUploadedAt: Date | null;
  verificationStatus: string | null;
  verificationSource: string | null;
  verificationRef: string | null;
  verificationReason: string | null;
  verificationData: unknown;
  verificationCheckedAt: Date | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  consultationFee: number | null;
}

/**
 * Abstracts Prisma access for doctor creation, update, and cascading deletion.
 * Mirrors the existing `IAppointmentRepository` pattern. Used by
 * `DoctorsCommandService`; counterpart query reads stay on `DoctorsQueryService`.
 */
export interface IDoctorRepository {
  createDoctorWithClinic(
    user: CreateDoctorUserInput,
    link: DoctorClinicLink,
    primarySpecialization?: Specialization,
  ): Promise<CreatedDoctorUser>;

  /** Returns the number of rows updated (0 = doctor not found). */
  updateDoctorProfile(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<number>;

  /** Narrow read for the post-update response — null if the doctor disappeared mid-transaction. */
  findDoctorForResponse(id: string): Promise<DoctorAfterUpdate | null>;

  updateDoctorClinicRole(doctorId: string, role: Role | string): Promise<void>;

  /** Cascades education / certification / specialization / clinic-link / user deletion. Returns user delete count. */
  deleteDoctorCascading(id: string): Promise<number>;
}

export const DOCTOR_REPOSITORY_TOKEN = Symbol('IDoctorRepository');
