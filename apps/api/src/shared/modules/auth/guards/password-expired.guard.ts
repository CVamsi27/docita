import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { Reflector } from '@nestjs/core';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domains/users/core/repositories/user.repository.interface';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

export const SKIP_PASSWORD_EXPIRY_KEY = 'skipPasswordExpiry';

export const SkipPasswordExpiry = () =>
  SetMetadata(SKIP_PASSWORD_EXPIRY_KEY, true);

@Injectable()
export class PasswordExpiredGuard implements CanActivate {
  private readonly logger = new Logger(PasswordExpiredGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly users: IUserRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
      const passwordExpiresAt = await this.users.findPasswordExpiresAt(userId);

      if (passwordExpiresAt && passwordExpiresAt < this.clock.now()) {
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
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      this.logger.warn(
        `Failed to check password expiry for user ${userId}: ${errorMessage}`,
      );
      throw new ForbiddenException({
        message:
          'Unable to validate password expiry right now. Please try again shortly.',
        code: 'PASSWORD_EXPIRY_CHECK_FAILED',
      });
    }

    return true;
  }
}
