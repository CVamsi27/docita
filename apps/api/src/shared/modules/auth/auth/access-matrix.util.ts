import { Role } from '@workspace/db';
import {
  type AppAccessTarget,
  type AccessMode,
  getAccessFeature,
  getAccessRoles,
} from '@workspace/types';
import { Feature } from './tier.decorator';

function parseDbRole(role: string): Role | null {
  switch (role) {
    case Role.DOCTOR:
      return Role.DOCTOR;
    case Role.NURSE:
      return Role.NURSE;
    case Role.RECEPTIONIST:
      return Role.RECEPTIONIST;
    case Role.ADMIN:
      return Role.ADMIN;
    case Role.INTERNAL:
      return Role.INTERNAL;
    case Role.ADMIN_DOCTOR:
      return Role.ADMIN_DOCTOR;
    case Role.PATIENT:
      return Role.PATIENT;
    case Role.LAB:
      return Role.LAB;
    default:
      return null;
  }
}

export function getDbRolesForTarget(
  target: AppAccessTarget,
  mode: AccessMode = 'read',
): Role[] {
  return getAccessRoles(target, mode)
    .map(parseDbRole)
    .filter((role): role is Role => role !== null);
}

export function getFeatureForTarget(
  target: AppAccessTarget,
): Feature | undefined {
  return getAccessFeature(target);
}

export function requireFeatureForTarget(target: AppAccessTarget): Feature {
  const feature = getFeatureForTarget(target);
  if (!feature) {
    throw new Error(`Missing feature mapping for access target: ${target}`);
  }
  return feature;
}
