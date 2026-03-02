import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { IpRateLimitService } from '@/shared/modules/services/ip-rate-limit.service';

type RequestWithClientIp = Request & { clientIp?: string };

@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(private readonly ipRateLimitService: IpRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithClientIp>();
    const ip = this.ipRateLimitService.getClientIp(request);

    if (!this.ipRateLimitService.checkRateLimit(ip)) {
      const remainingBanTime = this.ipRateLimitService.getRemainingBanTime(ip);

      if (remainingBanTime > 0) {
        throw new HttpException(
          `IP address temporarily blocked. Try again in ${remainingBanTime} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else {
        throw new HttpException(
          'Too many authentication attempts. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    request.clientIp = ip;

    return true;
  }
}
