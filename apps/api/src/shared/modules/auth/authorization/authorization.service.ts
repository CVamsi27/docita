import { Injectable, Logger } from '@nestjs/common';
import { Role, SubscriptionStatus } from '@workspace/db';
import {
  APP_PERMISSIONS_BY_ROLE,
  Feature,
  BILLING_ROLES,
  getAccessRoles,
  getAccessFeature,
  mapDbClinicTierStringToTierName,
} from '@workspace/types';
import {
  hasFeatureAccess,
  isFeatureGenerallyAvailable,
} from '@workspace/utils';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import { ResourcePolicyRegistry } from './policies/registry';
import { dbRoleToUserRole } from './role-bridge';
import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationDenyReason,
  AuthorizationResource,
  AuthorizationUser,
} from './types';

const ALLOWED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.GRACE,
  SubscriptionStatus.PAUSED,
]);

/**
 * Single decision point for "can this user perform this action on this resource."
 *
 * Composes the existing checks in the documented order:
 *   subscription status → role → feature (tier + override) → ABAC policy
 *
 * The existing decorators (`@Roles`, `@RequireFeature`, `TierGuard`) remain the
 * canonical mechanism for declarative route protection — this service is meant
 * for service-layer / programmatic checks where composing decorators is awkward
 * (e.g. background jobs, conditional UI state, list filtering).
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly clinicAuthCache: ClinicAuthCacheService,
    private readonly policies: ResourcePolicyRegistry,
  ) {}

  async can(
    user: AuthorizationUser,
    action: AuthorizationAction,
    resource: AuthorizationResource,
    context: AuthorizationContext = {},
  ): Promise<AuthorizationDecision> {
    if (!user) return deny('no_user');

    // INTERNAL users (Docita ops) bypass tenant / tier checks.
    if (user.role === Role.INTERNAL) return allow();

    if (!user.clinicId) return deny('no_clinic');

    const auth = await this.clinicAuthCache.getClinicAuth(user.clinicId);

    if (!ALLOWED_SUBSCRIPTION_STATUSES.has(auth.subscriptionStatus)) {
      return deny('subscription_inactive');
    }

    if (auth.hasOutstandingPendingPayment && !isBillingAdmin(user.role)) {
      return deny('subscription_billing_locked');
    }

    const requiredFeature =
      context.feature ?? inferFeatureFromTarget(context.target);
    if (requiredFeature) {
      if (!isFeatureGenerallyAvailable(requiredFeature)) {
        return deny('feature_not_available', { feature: requiredFeature });
      }
      const tierName = mapDbClinicTierStringToTierName(auth.tier);
      const allowedByTier = hasFeatureAccess(
        tierName,
        requiredFeature,
        auth.hasIntelligence,
        auth.features,
        auth.planMode,
      );
      if (!allowedByTier) {
        return deny('feature_locked', {
          feature: requiredFeature,
          mode: auth.planMode,
        });
      }
    }

    if (context.target) {
      const allowedRoles = getAccessRoles(
        context.target,
        context.mode ?? 'read',
      );
      const userRoleName = dbRoleToUserRole(user.role);
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRoleName)) {
        return deny('role_denied', { target: context.target });
      }
    } else if (context.permission) {
      const userRoleName = dbRoleToUserRole(user.role);
      const perms = APP_PERMISSIONS_BY_ROLE[userRoleName];
      if (!perms?.includes(context.permission)) {
        return deny('permission_denied', { permission: context.permission });
      }
    }

    const policy = this.policies.get(resource);
    if (policy) {
      const result = await policy.can(action, user, context);
      if (!result.allowed) return result;
    }

    return allow();
  }

  /** Convenience: returns just the boolean. */
  async check(
    user: AuthorizationUser,
    action: AuthorizationAction,
    resource: AuthorizationResource,
    context: AuthorizationContext = {},
  ): Promise<boolean> {
    return (await this.can(user, action, resource, context)).allowed;
  }
}

function isBillingAdmin(role: Role): boolean {
  return BILLING_ROLES.has(role as never);
}

function inferFeatureFromTarget(
  target: AuthorizationContext['target'],
): Feature | undefined {
  if (!target) return undefined;
  return getAccessFeature(target) ?? undefined;
}

function allow(): AuthorizationDecision {
  return { allowed: true };
}

function deny(
  reason: AuthorizationDenyReason,
  detail?: Record<string, unknown>,
): AuthorizationDecision {
  return { allowed: false, reason, ...(detail ? { detail } : {}) };
}
