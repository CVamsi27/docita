import { applyDecorators, UseGuards } from '@nestjs/common';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';

/** Shared RBAC + tier gates for legacy `/whatsapp/*` clinic routes. */
export function LegacyWhatsappClinicAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP)),
    Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_WHATSAPP)),
  );
}
