import { Role } from '@workspace/db';
import {
  type AppAccessTarget,
  type AccessMode,
  getAccessFeature,
  getAccessRoles,
} from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { Feature } from './tier.decorator';

const DB_ROLE_VALUES = Object.values(Role);

export function getDbRolesForTarget(
  target: AppAccessTarget,
  mode: AccessMode = 'read',
): Role[] {
  return getAccessRoles(target, mode)
    .map((role) => parseStringEnumMember(DB_ROLE_VALUES, role))
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
