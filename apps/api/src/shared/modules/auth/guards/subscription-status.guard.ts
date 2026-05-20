import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Reflector } from '@nestjs/core';
import { SubscriptionStatus } from '@workspace/db';
import { IS_PUBLIC_KEY } from '@/shared/modules/auth/auth/public.decorator';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import {
  isBillingAdminRole,
  isSubscriptionPastGraceDeadline,
} from '@/shared/modules/auth/utils/subscription-hard-lock.util';
import { getTrialWindowState } from '@/shared/modules/auth/utils/trial-window.util';

export { IS_PUBLIC_KEY };
export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck';

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(
    private reflector: Reflector,
    private clinicAuthCache: ClinicAuthCacheService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
        { bypassCache: true },
      );

      if (
        isSubscriptionPastGraceDeadline({
          subscriptionStatus: clinicAuth.subscriptionStatus,
          graceUntil: clinicAuth.subscriptionGraceUntil,
        }) &&
        !isBillingAdminRole(user.role)
      ) {
        throw new ForbiddenException({
          message:
            'Your workspace is temporarily restricted until billing is resolved. Ask an organization admin to update subscription billing.',
          code: 'SUBSCRIPTION_HARD_LOCKED',
          action: 'BILLING_REQUIRED',
          billingSettingsUrl: '/settings?tab=subscription',
        });
      }

      const trialWindowState = getTrialWindowState({
        subscriptionStatus: clinicAuth.subscriptionStatus,
        trialEnd: clinicAuth.subscriptionTrialEnd,
        now: this.clock.now(),
      });

      if (trialWindowState === 'EXPIRED' && !isBillingAdminRole(user.role)) {
        throw new ForbiddenException({
          message:
            'Your free trial has ended. An organization admin needs to add a paid plan to keep using Docita.',
          code: 'TRIAL_EXPIRED',
          action: 'BILLING_REQUIRED',
          billingSettingsUrl: '/settings?tab=subscription',
        });
      }

      if (trialWindowState === 'EXPIRED') {
        // Billing admin: allow access so they can pay, but signal the state.
        request.subscriptionEffectiveStatus = 'TRIAL_EXPIRED';
      } else if (trialWindowState === 'GRACE') {
        request.subscriptionEffectiveStatus = 'TRIAL_GRACE';
      }

      const allowedStatuses: SubscriptionStatus[] = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
        // Billing-issue states should still allow limited access (upgrade UX handles messaging).
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.GRACE,
        SubscriptionStatus.PAUSED,
      ];

      if (!allowedStatuses.includes(clinicAuth.subscriptionStatus)) {
        throw new ForbiddenException({
          message:
            'Your subscription has expired. Please renew your subscription to continue using Docita.',
          code: 'SUBSCRIPTION_INACTIVE',
          action: 'RENEW',
          upgradeUrl: '/settings?tab=subscription',
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
