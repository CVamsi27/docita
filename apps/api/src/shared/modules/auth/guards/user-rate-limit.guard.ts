import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserRateLimitService } from '@/shared/modules/services/user-rate-limit.service';
import { AuthenticatedRequest } from '@workspace/types';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private readonly userRateLimitService: UserRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = getAuthenticatedUserId(request.user);

    if (!userId) {
      return true;
    }

    if (!this.userRateLimitService.checkRateLimit(userId)) {
      const remaining = this.userRateLimitService.getRemainingRequests(userId);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down.',
          retryAfter: 60,
          remainingRequests: remaining,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
