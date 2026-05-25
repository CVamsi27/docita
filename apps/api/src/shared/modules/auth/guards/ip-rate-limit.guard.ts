import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { IpRateLimitService } from '@/shared/modules/services/ip-rate-limit.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

type RequestWithClientIp = Request & { clientIp?: string };

@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(
    private readonly ipRateLimitService: IpRateLimitService,
    private readonly config: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithClientIp>();

    const e2eHeader = request.headers?.['x-docita-e2e'];
    const e2eValue = Array.isArray(e2eHeader)
      ? String(e2eHeader[0])
      : typeof e2eHeader === 'string'
        ? e2eHeader
        : undefined;
    if (this.config.shouldBypassGuardForE2e(e2eValue)) {
      request.clientIp = this.ipRateLimitService.getClientIp(request);
      return true;
    }
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
