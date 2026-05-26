import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@workspace/db';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';

/** Shared RBAC, tier gate, and idempotency for `/appointments/*` routes. */
export function AppointmentsApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    RequireFeature(Feature.CALENDAR_SLOTS),
    Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS)),
  );
}

export function getAppointmentAccessContext(req: RequestWithUser): {
  role?: Role;
  userId?: string;
} {
  return {
    role: req.user?.role,
    userId: req.user?.id,
  };
}
