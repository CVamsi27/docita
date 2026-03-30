import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { AuthenticatedRequest } from '@workspace/types';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

export const SkipEmailVerification = () =>
  Reflect.metadata(SKIP_EMAIL_VERIFICATION_KEY, true);

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
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
    if (!request.user?.sub) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { emailVerified: true },
    });

    if (user && !user.emailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Please verify your email address before continuing. Check your inbox or request a new verification link at POST /auth/resend-verification.',
      });
    }

    return true;
  }
}
