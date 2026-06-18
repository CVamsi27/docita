import { Role } from '@workspace/db';
import { isFrontDeskPlanMode } from '@workspace/types';
import { type ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';

export type ClinicMemberRole =
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'ADMIN'
  | 'ADMIN_DOCTOR'
  | 'LAB';

/** Clinic admins (ADMIN / ADMIN_DOCTOR) may assign any allowed clinic member role. */
export const actorMayAssignMemberRoles = (
  actorRole: Role | ClinicMemberRole | undefined,
): actorRole is 'ADMIN' | 'ADMIN_DOCTOR' =>
  actorRole === Role.ADMIN || actorRole === Role.ADMIN_DOCTOR;

export function mapClinicMemberRoleToPrisma(role: ClinicMemberRole): Role {
  if (role === 'DOCTOR') return Role.DOCTOR;
  if (role === 'NURSE') return Role.NURSE;
  if (role === 'RECEPTIONIST') return Role.RECEPTIONIST;
  if (role === 'ADMIN') return Role.ADMIN;
  if (role === 'LAB') return Role.LAB;
  return Role.ADMIN_DOCTOR;
}

export async function isClinicFrontDesk(
  persistence: ClinicPersistencePort,
  clinicId: string,
): Promise<boolean> {
  const clinic = await persistence.clinic.findUnique({
    where: { id: clinicId },
    select: { tier: true, planMode: true },
  });
  return isFrontDeskPlanMode(clinic?.tier ?? 'STARTER', clinic?.planMode);
}

export interface CreateDoctorData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

export interface CreateReceptionistData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: 'RECEPTIONIST' | 'NURSE';
}

export interface CreateClinicMemberData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: ClinicMemberRole;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  labId?: string;
}

/**
 * Reusable Prisma `select` field groups for staff-member projections.
 * `StaffManagementService` (`getDoctors`/`getReceptionists`/`getMembers`/
 * `updateMember`) and `StaffInviteService` (`createDoctor`/
 * `createReceptionist`/`createMember`) each project a different combination
 * of these groups — composing the combinations from shared building blocks
 * keeps their overlap structural instead of copy-pasted key lists that drift.
 */
export const STAFF_IDENTITY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phoneNumber: true,
} as const;

export const STAFF_CLINICAL_SELECT = {
  specialization: true,
  qualification: true,
  registrationNumber: true,
} as const;

export const STAFF_VERIFICATION_SELECT = {
  signatureUploadedAt: true,
  verificationStatus: true,
  verificationReason: true,
  verificationCheckedAt: true,
  profilePhotoUrl: true,
  labId: true,
} as const;

export const STAFF_TIMESTAMPS_SELECT = {
  createdAt: true,
  updatedAt: true,
} as const;

export interface UpdateMemberData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: ClinicMemberRole;
  labId?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}
