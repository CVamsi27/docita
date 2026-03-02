import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import {
  TIER_KEY,
  FEATURE_KEY,
  Tier,
  Feature,
  FEATURE_TIER_MAP,
} from './tier.decorator';
import { Role, SubscriptionStatus, ClinicTier } from '@workspace/db';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtAuthGuard: JwtAuthGuard,
    private clinicAuthCache: ClinicAuthCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    try {
      const canActivateJwt = await this.jwtAuthGuard.canActivate(context);
      if (!canActivateJwt) {
        throw new UnauthorizedException('Authentication required');
      }
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    const roleAllowed = this.checkRole(context, user);
    if (!roleAllowed) return false;

    const tierAllowed = await this.checkTier(context, user);
    if (!tierAllowed) return false;

    return true;
  }

  private checkRole(
    context: ExecutionContext,
    user: { role: Role; clinicId?: string },
  ): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException({
        message: 'You do not have the required role to access this resource.',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles,
        currentRole: user.role,
      });
    }

    return true;
  }

  private async checkTier(
    context: ExecutionContext,
    user: { role: Role; clinicId?: string },
  ): Promise<boolean> {
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

    if (!user.clinicId) {
      throw new ForbiddenException({
        message: 'User not associated with a clinic',
        code: 'NO_CLINIC',
      });
    }

    const clinicAuth = await this.clinicAuthCache.getClinicAuth(user.clinicId);

    if (
      clinicAuth.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      clinicAuth.subscriptionStatus !== SubscriptionStatus.TRIALING
    ) {
      throw new ForbiddenException({
        message: 'Your subscription is not active. Please renew to continue.',
        code: 'SUBSCRIPTION_INACTIVE',
        action: 'RENEW',
        upgradeUrl: '/settings/billing',
      });
    }

    const userTier = this.mapDbTierToEnum(clinicAuth.tier);

    if (requiredFeature !== undefined) {
      return this.checkFeatureAccess(
        requiredFeature,
        userTier,
        clinicAuth.hasIntelligence,
        clinicAuth.features,
      );
    }

    if (requiredTier !== undefined) {
      return this.checkTierAccess(
        requiredTier,
        userTier,
        clinicAuth.hasIntelligence,
      );
    }

    return true;
  }

  private checkFeatureAccess(
    feature: Feature,
    userTier: Tier,
    hasIntelligence: boolean,
    featureOverrides: Record<string, boolean>,
  ): boolean {
    if (featureOverrides[feature] !== undefined) {
      if (!featureOverrides[feature]) {
        throw new ForbiddenException({
          message: `The ${feature} feature is not available for your clinic.`,
          code: 'FEATURE_DISABLED',
        });
      }
      return true;
    }

    const featureTier = FEATURE_TIER_MAP[feature];

    if (featureTier === Tier.INTELLIGENCE) {
      if (!hasIntelligence) {
        throw new ForbiddenException({
          message: 'This feature requires the Docita Intelligence add-on.',
          code: 'INTELLIGENCE_REQUIRED',
          action: 'UPGRADE',
          upgradeUrl: '/settings/billing?addon=intelligence',
        });
      }
      return true;
    }

    if (userTier < featureTier) {
      throw new ForbiddenException({
        message: `This feature requires ${this.getTierName(featureTier)} tier or higher.`,
        code: 'INSUFFICIENT_TIER',
        requiredTier: this.getTierName(featureTier),
        currentTier: this.getTierName(userTier),
        action: 'UPGRADE',
        upgradeUrl: '/settings/billing',
      });
    }

    return true;
  }

  private checkTierAccess(
    requiredTier: Tier,
    userTier: Tier,
    hasIntelligence: boolean,
  ): boolean {
    if (requiredTier === Tier.INTELLIGENCE && !hasIntelligence) {
      throw new ForbiddenException({
        message: 'This feature requires the Docita Intelligence add-on.',
        code: 'INTELLIGENCE_REQUIRED',
        action: 'UPGRADE',
        upgradeUrl: '/settings/billing?addon=intelligence',
      });
    }

    if (requiredTier !== Tier.INTELLIGENCE && userTier < requiredTier) {
      throw new ForbiddenException({
        message: `This feature requires ${this.getTierName(requiredTier)} tier or higher.`,
        code: 'INSUFFICIENT_TIER',
        requiredTier: this.getTierName(requiredTier),
        currentTier: this.getTierName(userTier),
        action: 'UPGRADE',
        upgradeUrl: '/settings/billing',
      });
    }

    return true;
  }

  private mapDbTierToEnum(dbTier: ClinicTier): Tier {
    const tierMap: Record<string, Tier> = {
      CAPTURE: Tier.CAPTURE,
      CORE: Tier.CORE,
      PLUS: Tier.PLUS,
      PRO: Tier.PRO,
      ENTERPRISE: Tier.ENTERPRISE,

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
