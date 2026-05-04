import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { TIER_KEY, FEATURE_KEY, Tier, Feature } from './tier.decorator';
import {
  SubscriptionStatus,
  IntelligenceAddon,
  ClinicTier,
} from '@workspace/db';
import { bypassesSessionGuards } from './auth-route-metadata.util';
import {
  isBillingAdminRole,
  isSubscriptionPastGraceDeadline,
} from '@/shared/modules/auth/utils/subscription-hard-lock.util';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
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
        subscription: {
          select: {
            graceUntil: true,
          },
        },
      },
    });

    if (!clinic) {
      if (user.role === 'INTERNAL') {
        return true;
      }
      throw new ForbiddenException('Clinic not found');
    }

    if (
      isSubscriptionPastGraceDeadline({
        subscriptionStatus: clinic.subscriptionStatus,
        graceUntil: clinic.subscription?.graceUntil,
      }) &&
      !isBillingAdminRole(user.role)
    ) {
      throw new ForbiddenException(
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

    if (!allowedSubscriptionStatuses.has(clinic.subscriptionStatus)) {
      throw new ForbiddenException(
        'Subscription is not active. Please renew your subscription.',
      );
    }

    const userTier = this.mapDbTierToEnum(clinic.tier);
    const hasIntelligence =
      clinic.intelligenceAddon === IntelligenceAddon.ACTIVE;

    if (requiredFeature !== undefined) {
      assertClinicHasFeatureOrThrow(
        {
          tier: clinic.tier,
          intelligenceAddon: clinic.intelligenceAddon,
          features: clinic.features,
        },
        requiredFeature,
      );
      return true;
    }

    if (requiredTier !== undefined) {
      if (requiredTier === Tier.INTELLIGENCE && !hasIntelligence) {
        throw new ForbiddenException(
          'This feature requires the Intelligence add-on.',
        );
      }

      if (
        userTier === Tier.FRONT_DESK &&
        requiredTier !== Tier.INTELLIGENCE &&
        requiredTier > Tier.ESSENTIAL
      ) {
        throw new ForbiddenException(
          `This feature requires ${this.getTierName(requiredTier)} tier or higher.`,
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
      [ClinicTier.FRONT_DESK]: Tier.FRONT_DESK,
    };

    return tierMap[dbTier] ?? Tier.STARTER;
  }

  private getTierName(tier: Tier): string {
    const names: Record<Tier, string> = {
      [Tier.STARTER]: 'Starter',
      [Tier.ESSENTIAL]: 'Essential',
      [Tier.PROFESSIONAL]: 'Professional',
      [Tier.ENTERPRISE]: 'Enterprise',
      [Tier.INTELLIGENCE]: 'Intelligence',
      [Tier.FRONT_DESK]: 'Front desk',
    };
    return names[tier] || 'Unknown';
  }
}
