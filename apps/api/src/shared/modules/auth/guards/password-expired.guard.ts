import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

const SKIP_PASSWORD_EXPIRY_KEY = 'skipPasswordExpiry';

export const SkipPasswordExpiry = () =>
  Reflect.metadata(SKIP_PASSWORD_EXPIRY_KEY, true);

@Injectable()
export class PasswordExpiredGuard implements CanActivate {
  private readonly logger = new Logger(PasswordExpiredGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_EXPIRY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = getAuthenticatedUserId(user);

    if (!userId) {
      return true;
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordExpiresAt: true },
      });

      if (dbUser?.passwordExpiresAt && dbUser.passwordExpiresAt < new Date()) {
        throw new ForbiddenException({
          message:
            'Your password has expired. Please change your password to continue.',
          code: 'PASSWORD_EXPIRED',
          action: 'CHANGE_PASSWORD',
          changePasswordUrl: '/auth/change-password',
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.warn('Failed to check password expiry', {
        userId,
        error,
      });
      throw new ForbiddenException({
        message:
          'Unable to validate password expiry right now. Please try again shortly.',
        code: 'PASSWORD_EXPIRY_CHECK_FAILED',
      });
    }

    return true;
  }
}
