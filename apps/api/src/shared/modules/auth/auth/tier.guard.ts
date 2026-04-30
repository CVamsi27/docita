import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TIER_KEY,
  FEATURE_KEY,
  Tier,
  Feature,
  FEATURE_TIER_MAP,
  isFeatureGenerallyAvailable,
} from './tier.decorator';
import {
  SubscriptionStatus,
  IntelligenceAddon,
  ClinicTier,
} from '@workspace/db';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
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

    if (requiredTier === undefined && requiredFeature === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      if (user?.role === 'INTERNAL') {
        return true;
      }
      throw new ForbiddenException('User not associated with a clinic');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
        subscriptionStatus: true,
      },
    });

    if (!clinic) {
      if (user.role === 'INTERNAL') {
        return true;
      }
      throw new ForbiddenException('Clinic not found');
    }

    const allowedSubscriptionStatuses = new Set<SubscriptionStatus>([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.GRACE,
      SubscriptionStatus.PAUSED,
    ]);

    if (!allowedSubscriptionStatuses.has(clinic.subscriptionStatus)) {
      throw new ForbiddenException(
        'Subscription is not active. Please renew your subscription.',
      );
    }

    const userTier = this.mapDbTierToEnum(clinic.tier);
    const hasIntelligence =
      clinic.intelligenceAddon === IntelligenceAddon.ACTIVE;

    const featureOverrides = (clinic.features as Record<string, boolean>) || {};

    if (requiredFeature !== undefined) {
      if (!isFeatureGenerallyAvailable(requiredFeature)) {
        throw new ForbiddenException(
          `The ${requiredFeature} feature is not available yet.`,
        );
      }

      const featureTier = FEATURE_TIER_MAP[requiredFeature];

      if (featureOverrides[requiredFeature] !== undefined) {
        if (!featureOverrides[requiredFeature]) {
          throw new ForbiddenException(
            `The ${requiredFeature} feature is not available for your clinic.`,
          );
        }
        return true;
      }

      if (featureTier === Tier.INTELLIGENCE) {
        if (!hasIntelligence) {
          throw new ForbiddenException(
            `This feature requires the Intelligence add-on.`,
          );
        }
        return true;
      }

      if (userTier < featureTier) {
        throw new ForbiddenException(
          `This feature requires ${this.getTierName(featureTier)} tier or higher.`,
        );
      }

      return true;
    }

    if (requiredTier !== undefined) {
      if (requiredTier === Tier.INTELLIGENCE && !hasIntelligence) {
        throw new ForbiddenException(
          'This feature requires the Intelligence add-on.',
        );
      }

      if (requiredTier !== Tier.INTELLIGENCE && userTier < requiredTier) {
        throw new ForbiddenException(
          `This feature requires ${this.getTierName(requiredTier)} tier or higher.`,
        );
      }
    }

    return true;
  }

  private mapDbTierToEnum(dbTier: ClinicTier): Tier {
    const tierMap: Record<string, Tier> = {
      [ClinicTier.STARTER]: Tier.STARTER,
      [ClinicTier.ESSENTIAL]: Tier.ESSENTIAL,
      [ClinicTier.PROFESSIONAL]: Tier.PROFESSIONAL,
      [ClinicTier.ENTERPRISE]: Tier.ENTERPRISE,
    };

    return tierMap[dbTier] ?? Tier.STARTER;
  }

  private getTierName(tier: Tier): string {
    const names: Record<Tier, string> = {
      [Tier.STARTER]: 'Free',
      [Tier.ESSENTIAL]: 'Essential',
      [Tier.PROFESSIONAL]: 'Professional',
      [Tier.ENTERPRISE]: 'Enterprise',
      [Tier.INTELLIGENCE]: 'Intelligence',
    };
    return names[tier] || 'Unknown';
  }
}
