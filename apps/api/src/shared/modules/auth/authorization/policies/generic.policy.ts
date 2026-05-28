import { Injectable } from '@nestjs/common';
import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationUser,
  ResourcePolicy,
} from '../types';

/**
 * Fallback policy for resources without bespoke ownership logic. Enforces the
 * baseline tenant invariant: the resource (if it carries a `clinicId`) must
 * belong to the user's clinic.
 */
@Injectable()
export class GenericTenantPolicy implements ResourcePolicy {
  can(
    _action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision {
    if (
      context.resourceClinicId &&
      user.clinicId &&
      context.resourceClinicId !== user.clinicId
    ) {
      return { allowed: false, reason: 'tenant_mismatch' };
    }
    return { allowed: true };
  }
}
