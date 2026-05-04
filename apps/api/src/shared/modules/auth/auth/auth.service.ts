import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OnboardingStep, Role } from '@workspace/db';
import { IPasswordPolicy } from './policies/password.policy';
import { UserFactory } from '@/domains/users/core/factories/user.factory';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { nanoid } from 'nanoid';
import { MfaService } from './mfa.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: Role;
  clinicId: string | null;
  emailVerified?: boolean;
  onboardingStep?: OnboardingStep | null;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: Role;
  clinicId?: string;
  clinicName?: string;
}

interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private emailLookupDisabled = false;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('IPasswordPolicy') private passwordPolicy: IPasswordPolicy,
    private userFactory: UserFactory,
    private monitoringService: MonitoringService,
    private observability: ObservabilityService,
    private mfaService: MfaService,
    private emailService: EmailService,
  ) {}

  private isDatabaseAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === 'string' ? candidate.code : '';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';

    if (code === 'P1000') {
      return true;
    }

    return (
      message.includes('authentication failed against the database server') ||
      message.includes('database credentials') ||
      message.includes('password authentication failed')
    );
  }

  private isDatabaseConnectivityError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { message?: unknown };
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';

    return (
      message.includes('self-signed certificate in certificate chain') ||
      message.includes('error opening a tls connection') ||
      message.includes('connection refused') ||
      message.includes('timed out') ||
      message.includes('database unavailable') ||
      message.includes('server closed the connection unexpectedly')
    );
  }

  async checkEmailExists(email: string): Promise<boolean> {
    if (this.emailLookupDisabled) {
      return false;
    }

    try {
      return await this.prisma.runUnrestricted(async () => {
        const user = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        return !!user;
      });
    } catch (error) {
      if (
        this.isDatabaseAuthError(error) ||
        this.isDatabaseConnectivityError(error)
      ) {
        this.emailLookupDisabled = true;
        this.logger.warn(
          'Disabling email-exists database lookup due to database availability failure. Verify DATABASE_URL and TLS configuration.',
        );
        return false;
      }

      throw error;
    }
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        return null;
      }

      if (user.appLoginDisabled) {
        throw new ForbiddenException('This profile cannot sign in to the app.');
      }

      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.accountLockedUntil.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`,
        );
      }

      if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
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
        lastFailedLoginAt: new Date(),
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

  async loginWithMfaCheck(
    user: UserWithoutPassword,
  ): Promise<
    | { mfa_required: true; mfa_challenge_token: string }
    | Awaited<ReturnType<typeof this.login>>
  > {
    if (user.mfaEnabled) {
      const challengeToken = await this.mfaService.issueMfaChallenge(user.id);
      return { mfa_required: true, mfa_challenge_token: challengeToken };
    }
    return this.login(user);
  }

  async loginAfterMfa(
    challengeToken: string,
    totpCode: string,
    deviceInfo?: {
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const userId = await this.mfaService.verifyMfaChallenge(
      challengeToken,
      totpCode,
    );
    const user = await this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          emailVerified: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.login(user, undefined, deviceInfo);
  }

  async login(
    user: UserWithoutPassword,
    tokenFamily?: string,
    deviceInfo?: {
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const payload: Record<string, unknown> = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    };

    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.runUnrestricted(async () =>
        this.prisma.patient.findFirst({
          where: {
            userId: user.id,
          },
          select: { id: true },
        }),
      );

      if (patient) {
        payload.patientId = patient.id;
      }
    }

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = nanoid(64);

    const newTokenFamily = tokenFamily || nanoid(16);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(
          Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
        ),
        tokenFamily: newTokenFamily,
        deviceName: deviceInfo?.deviceName,
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
        lastUsedAt: new Date(),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        emailVerified: user.emailVerified,
        onboardingStep: user.onboardingStep ?? undefined,
      },
    };
  }

  async refreshTokens(incomingRefreshToken: string) {
    const storedToken = await this.prisma.runUnrestricted(async () => {
      return await this.prisma.refreshToken.findUnique({
        where: { token: incomingRefreshToken },
        include: { user: true },
      });
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.replacedByToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenFamily: storedToken.tokenFamily,
          userId: storedToken.userId,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been revoked. Please log in again.',
      );
    }

    const { password: _password, ...userWithoutPassword } = storedToken.user;
    const deviceInfo = {
      deviceName: storedToken.deviceName ?? undefined,
      ipAddress: storedToken.ipAddress ?? undefined,
      userAgent: storedToken.userAgent ?? undefined,
    };
    const newTokens = await this.login(
      userWithoutPassword,
      storedToken.tokenFamily ?? undefined,
      deviceInfo,
    );

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedByToken: newTokens.refresh_token,
      },
    });

    return newTokens;
  }

  async getSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string, exceptToken?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptToken ? { NOT: { token: exceptToken } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  async logout(refreshToken: string) {
    try {
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } catch {}
  }

  async register(data: RegisterData) {
    return this.prisma.runUnrestricted(async () => {
      this.passwordPolicy.validate(data.password);
      const isNonProduction = process.env.NODE_ENV !== 'production';
      const shouldAutoVerifyEmail =
        process.env.NODE_ENV === 'test' ||
        (isNonProduction && data.email.endsWith('@test.com'));

      if (await this.checkEmailExists(data.email)) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const defaultRole = data.clinicName ? Role.ADMIN : Role.DOCTOR;
      const role = data.role || defaultRole;

      if (data.clinicName) {
        throw new BadRequestException(
          'Clinic registration now requires onboarding. Please complete registration at /onboarding to accept SLA, choose plan/add-ons, and configure billing.',
        );
      }

      const userData = this.userFactory.create(role, {
        email: data.email,
        name: data.name,
        passwordHash: hashedPassword,
        clinicId: data.clinicId,
      });

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          onboardingStep: 'CHOOSE_PATH',
          onboardingStartedAt: new Date(),
          emailVerified: shouldAutoVerifyEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          emailVerified: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      const tokens = await this.login(user);
      let verificationEmailSent = shouldAutoVerifyEmail || !!user.emailVerified;

      if (!shouldAutoVerifyEmail) {
        verificationEmailSent = true;
        await this.sendVerificationEmail(user.id).catch((err: unknown) => {
          verificationEmailSent = false;
          this.logger.warn(
            'Failed to send verification email after registration',
            {
              userId: user.id,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        });
      }

      return {
        ...tokens,
        verificationEmailSent,
      };
    });
  }

  async requestPasswordReset(email: string) {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        this.logger.log('Password reset requested for non-existent email');
        return {
          message:
            'If an account with that email exists, a reset link has been sent.',
        };
      }

      const token = nanoid(64);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpiresAt: expiresAt,
        },
      });

      await this.emailService
        .sendPasswordResetEmail(email, token)
        .catch((err: unknown) => {
          this.logger.warn('Failed to send password reset email', {
            userId: user.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });

      this.logger.log('Password reset email sent', { userId: user.id });

      return {
        message:
          'If an account with that email exists, a reset link has been sent.',
      };
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiresAt: { gt: new Date() },
        },
        include: {
          passwordHistory: {
            orderBy: { createdAt: 'desc' },
            take: AUTH_CONSTANTS.PASSWORD_HISTORY_COUNT,
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      this.passwordPolicy.validate(newPassword);

      await this.checkPasswordHistory(
        newPassword,
        user.passwordHistory,
        user.password,
      );

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiresAt: null,
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastFailedLoginAt: null,
            passwordChangedAt: now,
            passwordExpiresAt: new Date(
              now.getTime() +
                AUTH_CONSTANTS.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
            ),
          },
        }),
        this.prisma.passwordHistory.create({
          data: { userId: user.id, passwordHash: user.password },
        }),
      ]);

      await this.prunePasswordHistory(user.id);

      this.logger.log('Password reset completed', { userId: user.id });

      return { message: 'Password has been reset successfully' };
    });
  }

  async changePassword(data: ChangePasswordData) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      include: {
        passwordHistory: {
          orderBy: { createdAt: 'desc' },
          take: AUTH_CONSTANTS.PASSWORD_HISTORY_COUNT,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordMatch = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    this.passwordPolicy.validate(data.newPassword);

    await this.checkPasswordHistory(
      data.newPassword,
      user.passwordHistory,
      user.password,
    );

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: data.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: now,
          passwordExpiresAt: new Date(
            now.getTime() +
              AUTH_CONSTANTS.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      }),
      this.prisma.passwordHistory.create({
        data: { userId: data.userId, passwordHash: user.password },
      }),
    ]);

    await this.prunePasswordHistory(data.userId);

    return { message: 'Password changed successfully' };
  }

  private async checkPasswordHistory(
    newPassword: string,
    history: Array<{ passwordHash: string }>,
    currentHash: string,
  ): Promise<void> {
    const allHashes = [currentHash, ...history.map((h) => h.passwordHash)];

    for (const hash of allHashes) {
      const isReused = await bcrypt.compare(newPassword, hash);
      if (isReused) {
        throw new BadRequestException(
          `Password cannot be the same as your last ${AUTH_CONSTANTS.PASSWORD_HISTORY_COUNT} passwords`,
        );
      }
    }
  }

  async sendVerificationEmail(userId: string): Promise<{ message: string }> {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailVerified: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      const token = nanoid(64);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpiresAt: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ),
        },
      });

      const result = await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        token,
      );

      if (!result.success) {
        throw new ServiceUnavailableException(
          'We could not send the verification email right now. Please try again.',
        );
      }

      return { message: 'Verification email sent' };
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiresAt: { gt: new Date() },
          emailVerified: false,
        },
        select: { id: true },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });

      return { message: 'Email verified successfully' };
    });
  }

  private async prunePasswordHistory(userId: string): Promise<void> {
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (history.length > AUTH_CONSTANTS.PASSWORD_HISTORY_COUNT) {
      const toDelete = history.slice(AUTH_CONSTANTS.PASSWORD_HISTORY_COUNT);
      await this.prisma.passwordHistory.deleteMany({
        where: { id: { in: toDelete.map((h) => h.id) } },
      });
    }
  }
}
