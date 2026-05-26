import { Role } from '@workspace/db';
import { isFrontDeskWorkspace, parseWorkspaceProfile } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';

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
  prisma: PrismaService,
  clinicId: string,
): Promise<boolean> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { tier: true, settings: true },
  });
  if (!clinic) {
    return false;
  }
  if (clinic.tier === 'FRONT_DESK') {
    return true;
  }
  const raw =
    clinic.settings && typeof clinic.settings === 'object'
      ? (clinic.settings as Record<string, unknown>)
      : {};
  return isFrontDeskWorkspace(parseWorkspaceProfile(raw.workspaceProfile));
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
