import { Role } from '@workspace/db';

export const ALL_STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.LAB,
];

export const CLINIC_ADMIN_ROLES: Role[] = [Role.ADMIN, Role.ADMIN_DOCTOR];

export function isClinicAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  return CLINIC_ADMIN_ROLES.some((adminRole) => adminRole === role);
}
