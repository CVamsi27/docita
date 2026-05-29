import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@workspace/db';
import { Feature } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';

export function AuditLogsApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(Role.ADMIN, Role.INTERNAL),
    RequireFeature(Feature.AUDIT_LOGS),
  );
}

export function AuditSummaryApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR),
    RequireFeature(Feature.AUDIT_LOGS),
  );
}
