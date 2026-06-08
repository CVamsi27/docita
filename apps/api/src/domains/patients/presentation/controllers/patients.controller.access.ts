// jscpd:ignore-start
import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@workspace/db';
import { APP_ACCESS_TARGETS, type AppAccessTarget } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';

/** Matrix-aligned tier + role gate for patient API surfaces. */
function patientsApiAccess(target: AppAccessTarget) {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(...getDbRolesForTarget(target)),
    RequireFeature(requireFeatureForTarget(target)),
  );
}

export function PatientsBasicManagementAccess(...roles: Role[]) {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(...roles),
    RequireFeature(Feature.BASIC_PATIENT_MANAGEMENT),
  );
}

export const PatientsTimelineApiAccess = () =>
  patientsApiAccess(APP_ACCESS_TARGETS.API_PATIENT_TIMELINE);

export const PatientsMetricsApiAccess = () =>
  patientsApiAccess(APP_ACCESS_TARGETS.API_PATIENT_METRICS);

export const PatientsPrescriptionsApiAccess = () =>
  // jscpd:ignore-end
  patientsApiAccess(APP_ACCESS_TARGETS.API_PRESCRIPTIONS);
