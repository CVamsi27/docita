import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserRateLimitService } from '@/shared/modules/services/user-rate-limit.service';
import { AuthenticatedRequest } from '@workspace/types';

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private readonly userRateLimitService: UserRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.sub) {
      return true;
    }

    const userId = request.user.sub;

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
