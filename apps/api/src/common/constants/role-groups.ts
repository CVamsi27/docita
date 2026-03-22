import { Role } from '@workspace/db';

export const ALL_STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.DOCTOR,
  Role.RECEPTIONIST,
];

export const CLINIC_ADMIN_ROLES: Role[] = [
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
];

export const CLINICAL_ROLES: Role[] = [
  Role.DOCTOR,
  Role.ADMIN_DOCTOR,
];
