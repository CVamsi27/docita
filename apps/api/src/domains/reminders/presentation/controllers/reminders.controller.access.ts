import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@workspace/db';
import { Feature } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';

export function RemindersApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR),
    RequireFeature(Feature.AUTO_REMINDERS),
  );
}
