import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { AuthenticatedRequest } from '@workspace/types';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

export const SkipEmailVerification = () =>
  Reflect.metadata(SKIP_EMAIL_VERIFICATION_KEY, true);

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  private readonly logger = new Logger(EmailVerifiedGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = getAuthenticatedUserId(request.user);
    if (!userId) return true;

    try {
      const users = await this.prisma.$queryRaw<
        Array<{ emailVerified: boolean }>
      >`
        SELECT "emailVerified"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
      `;
      const user = users[0] ?? null;

      if (user && !user.emailVerified) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'EMAIL_NOT_VERIFIED',
          message:
            'Please verify your email address before continuing. Check your inbox or request a new verification link at POST /auth/resend-verification.',
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
        `Failed to check email verification for user ${userId}: ${errorMessage}`,
      );

      throw new ForbiddenException({
        message:
          'Unable to validate email verification right now. Please try again shortly.',
        code: 'EMAIL_VERIFICATION_CHECK_FAILED',
      });
    }

    return true;
  }
}
