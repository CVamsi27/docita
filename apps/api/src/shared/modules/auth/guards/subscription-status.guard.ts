import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionStatus } from '@workspace/db';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck';

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(
    private reflector: Reflector,
    private clinicAuthCache: ClinicAuthCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipSubscriptionCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipSubscriptionCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true;
    }

    if (!user.clinicId) {
      return true;
    }

    try {
      const clinicAuth = await this.clinicAuthCache.getClinicAuth(
        user.clinicId,
      );

      const allowedStatuses: SubscriptionStatus[] = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
      ];

      if (!allowedStatuses.includes(clinicAuth.subscriptionStatus)) {
        throw new ForbiddenException({
          message:
            'Your subscription has expired. Please renew your subscription to continue using Docita.',
          code: 'SUBSCRIPTION_INACTIVE',
          action: 'RENEW',
          upgradeUrl: '/settings/billing',
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.warn(
        `Failed to check subscription status for clinic ${user.clinicId}`,
        error,
      );
    }

    return true;
  }
}
