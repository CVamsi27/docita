import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@workspace/db';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import type { UserWithoutPassword } from './auth.types';
import {
  isDatabaseAuthError,
  isDatabaseConnectivityError,
} from './auth-database.util';

@Injectable()
export class CredentialValidationService {
  private readonly logger = new Logger(CredentialValidationService.name);
  private emailLookupDisabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async checkEmailExists(email: string): Promise<boolean> {
    if (this.emailLookupDisabled) {
      return false;
    }

    try {
      // RLS-BYPASS: auth resolves users before clinic tenant context is established
      return await this.prisma.runUnrestricted(async () => {
        const user = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        return !!user;
      });
    } catch (error) {
      if (isDatabaseAuthError(error) || isDatabaseConnectivityError(error)) {
        this.emailLookupDisabled = true;
        this.logger.warn(
          'Disabling email-exists database lookup due to database availability failure. Verify DATABASE_URL and TLS configuration.',
        );
        return false;
      }

      throw error;
    }
  }

  private async assertClinicTierAllowsRole(
    clinicId: string | null,
    role: Role,
  ): Promise<void> {
    if (!clinicId) return;
    if (role !== Role.DOCTOR && role !== Role.ADMIN_DOCTOR) return;

    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    const clinic = await this.prisma.runUnrestricted(async () =>
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { tier: true },
      }),
    );

    if (clinic?.tier === 'FRONT_DESK') {
      throw new ForbiddenException(
        'Doctor and admin-doctor sign-in is not available on the Front Desk plan. ' +
          'Ask an admin to upgrade the clinic to enable clinical sign-in.',
      );
    }
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        return null;
      }

      if (user.appLoginDisabled) {
        throw new ForbiddenException('This profile cannot sign in to the app.');
      }

      await this.assertClinicTierAllowsRole(user.clinicId, user.role);

      if (
        user.accountLockedUntil &&
        user.accountLockedUntil > this.clock.now()
      ) {
        const minutesRemaining = Math.ceil(
          (user.accountLockedUntil.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`,
        );
      }

      if (
        user.accountLockedUntil &&
        user.accountLockedUntil <= this.clock.now()
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastFailedLoginAt: null,
          },
        });
      }

      const passwordMatch = await bcrypt.compare(pass, user.password);

      if (passwordMatch) {
        if (user.failedLoginAttempts > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lastFailedLoginAt: null,
            },
          });

          this.observability.logStructured(
            'info',
            'Successful login after failed attempts',
            {
              userId: user.id,
              previousFailedAttempts: user.failedLoginAttempts,
            },
          );
        }

        const { password: _password, ...result } = user;
        return { ...result, mfaEnabled: user.mfaEnabled };
      }

      const newFailedAttempts = user.failedLoginAttempts + 1;

      const updateData: Record<string, unknown> = {
        failedLoginAttempts: newFailedAttempts,
        lastFailedLoginAt: this.clock.now(),
      };

      if (newFailedAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS) {
        updateData.accountLockedUntil = new Date(
          Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000,
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      this.observability.logStructured(
        'warn',
        'Failed login attempt recorded',
        {
          userId: user.id,
          attempt: newFailedAttempts,
          maxAttempts: AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS,
          accountLocked:
            newFailedAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS,
          accountLockedUntilMinutes:
            newFailedAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS
              ? AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES
              : null,
        },
        { captureInSentry: false },
      );

      if (newFailedAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS) {
        this.observability.captureMessage(
          `Account locked for user ${user.id} due to ${AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts`,
          {
            userId: user.id,
            failedAttempts: newFailedAttempts,
            lockoutDuration: `${AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES} minutes`,
          },
          'warning',
        );

        this.observability.recordMetric('auth_account_lockout_total', 1, {
          reason: 'max_failed_attempts',
        });
      }

      if (newFailedAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException(
          `Account locked due to ${AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts. Please try again in ${AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      return null;
    });
  }
}
