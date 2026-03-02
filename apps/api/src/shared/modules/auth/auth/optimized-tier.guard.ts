import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import {
  TIER_KEY,
  FEATURE_KEY,
  Tier,
  Feature,
  FEATURE_TIER_MAP,
} from './tier.decorator';
import { SubscriptionStatus } from '@workspace/db';

@Injectable()
export class OptimizedTierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private clinicAuthCache: ClinicAuthCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<Tier>(TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredFeature = this.reflector.getAllAndOverride<Feature>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredTier === undefined && requiredFeature === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      throw new ForbiddenException({
        message: 'User not associated with a clinic',
        code: 'NO_CLINIC',
        action: 'Please contact support to link your account to a clinic.',
      });
    }

    const clinicAuth = await this.clinicAuthCache.getClinicAuth(user.clinicId);

    if (
      clinicAuth.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      clinicAuth.subscriptionStatus !== SubscriptionStatus.TRIALING
    ) {
      throw new ForbiddenException({
        message: 'Subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE',
        action:
          'Please renew your subscription to continue using this feature.',
        upgradeUrl: '/upgrade',
      });
    }

    const userTier = this.mapDbTierToEnum(clinicAuth.tier);

    if (requiredFeature !== undefined) {
      return this.authorizeFeature(
        requiredFeature,
        userTier,
        clinicAuth.hasIntelligence,
        clinicAuth.features,
      );
    }

    if (requiredTier !== undefined) {
      return this.authorizeTier(requiredTier, userTier);
    }

    return true;
  }

  private authorizeFeature(
    requiredFeature: Feature,
    userTier: Tier,
    hasIntelligence: boolean,
    featureOverrides: Record<string, boolean>,
  ): boolean {
    const featureTier = FEATURE_TIER_MAP[requiredFeature];

    if (featureOverrides[requiredFeature] !== undefined) {
      if (!featureOverrides[requiredFeature]) {
        throw new ForbiddenException({
          message: `The ${requiredFeature} feature is not available`,
          code: 'FEATURE_DISABLED',
          feature: requiredFeature,
          action: 'This feature has been disabled for your clinic.',
        });
      }
      return true;
    }

    if (featureTier === Tier.INTELLIGENCE) {
      if (!hasIntelligence) {
        throw new ForbiddenException({
          message: `${requiredFeature} requires AI Intelligence add-on`,
          code: 'INTELLIGENCE_REQUIRED',
          feature: requiredFeature,
          action: 'Upgrade to AI Intelligence add-on to use this feature.',
          upgradeUrl: '/upgrade?addon=intelligence',
        });
      }
      return true;
    }

    if (!this.hasSufficientTier(featureTier, userTier)) {
      const tierNames = {
        [Tier.CAPTURE]: 'Capture',
        [Tier.CORE]: 'Core',
        [Tier.PLUS]: 'Plus',
        [Tier.PRO]: 'Pro',
        [Tier.ENTERPRISE]: 'Enterprise',
        [Tier.INTELLIGENCE]: 'AI Intelligence',
      };

      throw new ForbiddenException({
        message: `${requiredFeature} requires ${tierNames[featureTier]} plan or higher`,
        code: 'TIER_INSUFFICIENT',
        feature: requiredFeature,
        requiredTier: tierNames[featureTier],
        currentTier: tierNames[userTier],
        action: `Upgrade to ${tierNames[featureTier]} plan to unlock this feature.`,
        upgradeUrl: '/upgrade',
      });
    }

    return true;
  }

  private authorizeTier(requiredTier: Tier, userTier: Tier): boolean {
    if (!this.hasSufficientTier(requiredTier, userTier)) {
      const tierNames = {
        [Tier.CAPTURE]: 'Capture',
        [Tier.CORE]: 'Core',
        [Tier.PLUS]: 'Plus',
        [Tier.PRO]: 'Pro',
        [Tier.ENTERPRISE]: 'Enterprise',
        [Tier.INTELLIGENCE]: 'AI Intelligence',
      };

      throw new ForbiddenException({
        message: `This action requires ${tierNames[requiredTier]} plan or higher`,
        code: 'TIER_INSUFFICIENT',
        requiredTier: tierNames[requiredTier],
        currentTier: tierNames[userTier],
        action: `Upgrade to ${tierNames[requiredTier]} plan to continue.`,
        upgradeUrl: '/upgrade',
      });
    }

    return true;
  }

  private hasSufficientTier(required: Tier, current: Tier): boolean {
    return current >= required;
  }

  private mapDbTierToEnum(dbTier: string): Tier {
    const mapping: Record<string, Tier> = {
      CAPTURE: Tier.CAPTURE,
      CORE: Tier.CORE,
      PLUS: Tier.PLUS,
      PRO: Tier.PRO,
      ENTERPRISE: Tier.ENTERPRISE,
    };

    return mapping[dbTier] || Tier.CAPTURE;
  }
}
