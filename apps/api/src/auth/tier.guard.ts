import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  TIER_KEY,
  FEATURE_KEY,
  Tier,
  Feature,
  FEATURE_TIER_MAP,
} from './tier.decorator';

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

    // If no tier or feature requirement, allow access
    if (requiredTier === undefined && requiredFeature === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clinicId) {
      throw new ForbiddenException('User not associated with a clinic');
    }

    // Fetch clinic tier and intelligence addon status
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true, // Custom feature overrides
        subscriptionStatus: true,
      },
    });

    if (!clinic) {
      throw new ForbiddenException('Clinic not found');
    }

    // Check subscription status
    if (
      clinic.subscriptionStatus !== 'active' &&
      clinic.subscriptionStatus !== 'trial'
    ) {
      throw new ForbiddenException(
        'Subscription is not active. Please renew your subscription.',
      );
    }

    // Map database tier to enum
    const userTier = this.mapDbTierToEnum(clinic.tier);
    const hasIntelligence = clinic.intelligenceAddon === 'ACTIVE';

    // Check for custom feature overrides
    const featureOverrides = (clinic.features as Record<string, boolean>) || {};

    // If checking by feature
    if (requiredFeature !== undefined) {
      const featureTier = FEATURE_TIER_MAP[requiredFeature];

      // Check custom override first
      if (featureOverrides[requiredFeature] !== undefined) {
        if (!featureOverrides[requiredFeature]) {
          throw new ForbiddenException(
            `The ${requiredFeature} feature is not available for your clinic.`,
          );
        }
        return true;
      }

      // Intelligence tier features require the add-on
      if (featureTier === Tier.INTELLIGENCE) {
        if (!hasIntelligence) {
          throw new ForbiddenException(
            `This feature requires the Docita Intelligence add-on.`,
          );
        }
        return true;
      }

      // Check if user's tier meets feature requirement
      if (userTier < featureTier) {
        throw new ForbiddenException(
          `This feature requires ${this.getTierName(featureTier)} tier or higher.`,
        );
      }

      return true;
    }

    // If checking by tier directly
    if (requiredTier !== undefined) {
      // Intelligence tier check
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

  private mapDbTierToEnum(dbTier: string): Tier {
    const tierMap: Record<string, Tier> = {
      CAPTURE: Tier.CAPTURE,
      CORE: Tier.CORE,
      PLUS: Tier.PLUS,
      PRO: Tier.PRO,
      ENTERPRISE: Tier.ENTERPRISE,
      // Legacy mappings for backward compatibility
      FREE: Tier.CAPTURE,
      STARTER: Tier.CORE,
      PROFESSIONAL: Tier.PRO,
    };

    return tierMap[dbTier] ?? Tier.CAPTURE;
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
