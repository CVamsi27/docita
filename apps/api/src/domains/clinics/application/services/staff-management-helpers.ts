import { Role } from '@workspace/db';
import { type ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';

export type ClinicMemberRole =
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'ADMIN'
  | 'ADMIN_DOCTOR';

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
  return Role.ADMIN_DOCTOR;
}

export async function isClinicFrontDesk(
  persistence: ClinicPersistencePort,
  clinicId: string,
): Promise<boolean> {
  const clinic = await persistence.clinic.findUnique({
    where: { id: clinicId },
    select: { tier: true },
  });
  return clinic?.tier === 'FRONT_DESK';
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
}

export interface UpdateMemberData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: ClinicMemberRole;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}
