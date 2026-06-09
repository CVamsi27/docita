import { applyDecorators } from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';

const STAFF_SELF_SERVICE_ROLES = [
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
] as const;

/**
 * Shared by `getProfile`, `updateProfile`, and `requestAccountDeletion` —
 * all three are staff self-service endpoints that skip the subscription
 * gate and are open to the same set of clinical/admin staff roles. Composing
 * them here keeps the role list and gate from drifting across the trio.
 */
export function StaffSelfServiceAccess() {
  return applyDecorators(
    SkipSubscriptionCheck(),
    Roles(...STAFF_SELF_SERVICE_ROLES),
  );
}
