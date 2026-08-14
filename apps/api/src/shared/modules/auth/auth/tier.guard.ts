import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { Reflector } from '@nestjs/core';
import { Role, SubscriptionStatus, IntelligenceAddon } from '@workspace/db';
import { bypassesSessionGuards } from './auth-route-metadata.util';
import {
  isBillingAdminRole,
  isSubscriptionBillingHardLocked,
} from '@/shared/modules/auth/utils/subscription-hard-lock.util';
import {
  assertClinicHasFeatureOrThrow,
  assertClinicHasTierOrThrow,
  type ClinicFeatureAuthSnapshot,
} from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { TIER_KEY, FEATURE_KEY, Tier, Feature } from './tier.decorator';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private clinicAuthCache: ClinicAuthCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (bypassesSessionGuards(this.reflector, context)) {
      return true;
    }

    const requiredTier = this.reflector.getAllAndOverride<Tier>(TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredFeature = this.reflector.getAllAndOverride<Feature>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredTier === undefined && requiredFeature === undefined)
      return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      if (user?.role === Role.INTERNAL) return true;
      throw forbiddenProblem('NO_CLINIC', 'User not associated with a clinic');
    }

    if (user.role === Role.INTERNAL) return true;

    let auth;
    try {
      auth = await this.clinicAuthCache.getClinicAuth(user.clinicId);
    } catch {
      throw forbiddenProblem('CLINIC_NOT_FOUND', 'Clinic not found');
    }

    if (
      isSubscriptionBillingHardLocked({
        subscriptionStatus: auth.subscriptionStatus,
        graceUntil: auth.subscriptionGraceUntil,
        hasOutstandingPendingPayment: auth.hasOutstandingPendingPayment,
        subscriptionCurrentPeriodEnd: auth.subscriptionCurrentPeriodEnd,
      }) &&
      !isBillingAdminRole(user.role)
    ) {
      throw forbiddenProblem(
        'SUBSCRIPTION_HARD_LOCKED',
        'Workspace access is limited until billing is resolved.',
      );
    }

    const allowedSubscriptionStatuses = new Set<SubscriptionStatus>([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.GRACE,
      SubscriptionStatus.PAUSED,
    ]);

    if (!allowedSubscriptionStatuses.has(auth.subscriptionStatus)) {
      throw forbiddenProblem(
        'SUBSCRIPTION_INACTIVE',
        'Subscription is not active. Please renew your subscription.',
      );
    }

    const snapshot: ClinicFeatureAuthSnapshot = {
      tier: auth.tier,
      planMode: auth.planMode,
      intelligenceAddon: auth.hasIntelligence
        ? IntelligenceAddon.ACTIVE
        : IntelligenceAddon.NONE,
      features: auth.features,
    };

    if (requiredFeature !== undefined) {
      assertClinicHasFeatureOrThrow(snapshot, requiredFeature);
      return true;
    }

    if (requiredTier !== undefined) {
      assertClinicHasTierOrThrow(snapshot, requiredTier);
    }

    return true;
  }
}
