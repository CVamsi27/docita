import { Role } from '@workspace/db';
import {
  type AppAccessTarget,
  type AccessMode,
  getAccessFeature,
  getAccessRoles,
} from '@workspace/types';
import { Feature } from './tier.decorator';

export function getDbRolesForTarget(
  target: AppAccessTarget,
  mode: AccessMode = 'read',
): Role[] {
  return getAccessRoles(target, mode)
    .map((role) => Role[role as keyof typeof Role])
    .filter((role): role is Role => role !== undefined);
}

export function getFeatureForTarget(
  target: AppAccessTarget,
): Feature | undefined {
  return getAccessFeature(target) as Feature | undefined;
}

export function requireFeatureForTarget(target: AppAccessTarget): Feature {
  const feature = getFeatureForTarget(target);
  if (!feature) {
    throw new Error(`Missing feature mapping for access target: ${target}`);
  }
  return feature;
}
