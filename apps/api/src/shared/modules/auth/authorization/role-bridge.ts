import type { Role } from '@workspace/db';
import type { UserRole } from '@workspace/types';

const USER_ROLE_BY_DB_ROLE: Record<Role, UserRole> = {
  ADMIN: 'ADMIN',
  ADMIN_DOCTOR: 'ADMIN_DOCTOR',
  DOCTOR: 'DOCTOR',
  INTERNAL: 'INTERNAL',
  NURSE: 'NURSE',
  PATIENT: 'PATIENT',
  RECEPTIONIST: 'RECEPTIONIST',
  LAB: 'LAB',
};

export function dbRoleToUserRole(role: Role): UserRole {
  return USER_ROLE_BY_DB_ROLE[role];
}
