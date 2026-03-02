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
} from './tier.decorator';
import {
  SubscriptionStatus,
  IntelligenceAddon,
  ClinicTier,
} from '@workspace/db';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
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
      throw new ForbiddenException('Clinic not found');
    }

    if (
      clinic.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      clinic.subscriptionStatus !== SubscriptionStatus.TRIALING
    ) {
      throw new ForbiddenException(
        'Subscription is not active. Please renew your subscription.',
      );
    }

    const userTier = this.mapDbTierToEnum(clinic.tier);
    const hasIntelligence =
      clinic.intelligenceAddon === IntelligenceAddon.ACTIVE;

    const featureOverrides = (clinic.features as Record<string, boolean>) || {};

    if (requiredFeature !== undefined) {
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
            `This feature requires the Docita Intelligence add-on.`,
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
          'This feature requires the Docita Intelligence add-on.',
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
    const tierMap: Record<ClinicTier, Tier> = {
      [ClinicTier.CAPTURE]: Tier.CAPTURE,
      [ClinicTier.CORE]: Tier.CORE,
      [ClinicTier.PLUS]: Tier.PLUS,
      [ClinicTier.PRO]: Tier.PRO,
      [ClinicTier.ENTERPRISE]: Tier.ENTERPRISE,
    } as Record<string, Tier>;

    const legacyMap: Record<string, Tier> = {
      FREE: Tier.CAPTURE,
      STARTER: Tier.CORE,
      PROFESSIONAL: Tier.PRO,
    };

    return tierMap[dbTier] ?? legacyMap[dbTier] ?? Tier.CAPTURE;
  }

  private getTierName(tier: Tier): string {
    const names: Record<Tier, string> = {
      [Tier.CAPTURE]: 'Docita Capture',
      [Tier.CORE]: 'Docita Core',
      [Tier.PLUS]: 'Docita Plus',
      [Tier.PRO]: 'Docita Pro',
      [Tier.ENTERPRISE]: 'Docita Enterprise',
      [Tier.INTELLIGENCE]: 'Docita Intelligence',
    };
    return names[tier] || 'Unknown';
  }
}
