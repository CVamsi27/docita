import { Role } from '@workspace/db';
import {
  type AppAccessTarget,
  type AccessMode,
  getAccessFeature,
  getAccessRoles,
} from '@workspace/types';
import { Feature } from './tier.decorator';

const DB_ROLE_VALUES = Object.values(Role);
const DB_ROLE_SET = new Set<string>(DB_ROLE_VALUES);

function parseDbRole(role: string): Role | null {
  return DB_ROLE_SET.has(role) ? (role as Role) : null;
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
