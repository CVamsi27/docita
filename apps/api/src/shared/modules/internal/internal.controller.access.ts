import { applyDecorators } from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';

/** Shared INTERNAL-only role gate for `/internal/*` routes (excludes `/internal/billing/*`). */
export function InternalApiAccess() {
  return applyDecorators(Roles(Role.INTERNAL));
}
