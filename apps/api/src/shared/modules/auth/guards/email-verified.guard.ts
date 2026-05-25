import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { AuthenticatedRequest } from '@workspace/types';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

export const SkipEmailVerification = () =>
  SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {}

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
    const e2eBypassHeader = request.headers?.['x-docita-e2e'];
    const e2eBypassValue = Array.isArray(e2eBypassHeader)
      ? String(e2eBypassHeader[0])
      : typeof e2eBypassHeader === 'string'
        ? e2eBypassHeader
        : undefined;
    if (this.config.shouldBypassGuardForE2e(e2eBypassValue)) {
      return true;
    }
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
