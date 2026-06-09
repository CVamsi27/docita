import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationUser,
  ResourcePolicy,
} from '../types';

export abstract class BaseResourcePolicy implements ResourcePolicy {
  can(
    action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision {
    const tenantDenial = this.checkTenantAccess(user, context);
    if (tenantDenial) return tenantDenial;
    return this.doCheck(action, user, context);
  }

  protected abstract doCheck(
    action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision;

  private checkTenantAccess(
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision | undefined {
    if (
      context.resourceClinicId &&
      user.clinicId &&
      context.resourceClinicId !== user.clinicId
    ) {
      return { allowed: false, reason: 'tenant_mismatch' };
    }
  }
}
