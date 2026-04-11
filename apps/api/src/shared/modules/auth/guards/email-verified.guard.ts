import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { AuthenticatedRequest } from '@workspace/types';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

export const SkipEmailVerification = () =>
  Reflect.metadata(SKIP_EMAIL_VERIFICATION_KEY, true);

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    // emailVerified is fetched from DB by JwtStrategy on every authenticated
    // request, so we can read it directly from req.user without a second query.
    if (request.user?.emailVerified === false) {
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
