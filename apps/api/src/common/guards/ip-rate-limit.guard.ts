import {
  Injectable,
  CanActivate,
  ExecutionContext,
  TooManyRequestsException,
} from '@nestjs/common';
import { Request } from 'express';
import { IpRateLimitService } from '../services/ip-rate-limit.service';

/**
 * Guard for IP-based rate limiting
 * Applies to authentication endpoints to prevent brute force attacks
 * Complements account-based rate limiting for defense-in-depth
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(private readonly ipRateLimitService: IpRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.ipRateLimitService.getClientIp(request);

    // Check if IP is rate limited
    if (!this.ipRateLimitService.checkRateLimit(ip)) {
      const remainingBanTime = this.ipRateLimitService.getRemainingBanTime(ip);

      if (remainingBanTime > 0) {
        // IP is banned
        throw new TooManyRequestsException(
          `IP address temporarily blocked. Try again in ${remainingBanTime} seconds.`,
        );
      } else {
        // Rate limit exceeded but not yet banned
        throw new TooManyRequestsException(
          'Too many authentication attempts. Please try again later.',
        );
      }
    }

    // Attach IP to request for logging/auditing
    request.ip = ip;

    return true;
  }
}
