import { applyDecorators, UseGuards } from '@nestjs/common';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
/** Shared RBAC, tier gate, and idempotency for `/appointments/*` routes. */
export function AppointmentsApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    RequireFeature(Feature.CALENDAR_SLOTS),
    Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS)),
  );
}
