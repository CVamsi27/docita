import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { IPasswordPolicy } from './policies/password.policy';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import type { ChangePasswordData } from './auth.types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class AuthPasswordService {
  private readonly logger = new Logger(AuthPasswordService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IPasswordPolicy') private readonly passwordPolicy: IPasswordPolicy,
    private readonly emailService: EmailService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async requestPasswordReset(email: string) {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
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
      const expiresAt = new Date(this.clock.now().getTime() + 60 * 60 * 1000);

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
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiresAt: { gt: this.clock.now() },
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

      const now = this.clock.now();
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

    const now = this.clock.now();
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
          `Password cannot match any of your last ${AUTH_CONSTANTS.PASSWORD_HISTORY_COUNT} passwords`,
        );
      }
    }
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
