import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Role } from '@workspace/db';
import { IS_PUBLIC_KEY } from '@/shared/modules/auth/auth/public.decorator';
import {
  RATE_LIMIT_HEADER_LIMIT,
  RATE_LIMIT_HEADER_REMAINING,
  RATE_LIMIT_HEADER_RESET,
  RATE_LIMIT_HEADER_WINDOW,
} from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.constants';
import { TenantRateLimitService } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.service';
import { RateLimitDecision } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.types';

interface AuthedRequest {
  user?: { clinicId?: string | null; role?: Role | string };
}

@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(TenantRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly service: TenantRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<'http' | 'ws' | 'rpc'>() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<AuthedRequest>();
    const response = http.getResponse<Response>();
    const user = request.user;

    if (!user || !user.clinicId) {
      return true;
    }

    if (user.role === Role.INTERNAL) {
      return true;
    }

    const decisions = await this.service.checkAndConsume(user.clinicId);
    const blocking = decisions.find((d) => !d.allowed);
    const headerSource = blocking ?? decisions.at(-1);

    if (headerSource) {
      this.applyHeaders(response, headerSource);
    }

    if (blocking) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Tenant API quota exceeded. Slow down or contact your administrator to raise the limit.',
          window: blocking.reason,
          retryAfterSeconds: blocking.resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private applyHeaders(response: Response, decision: RateLimitDecision): void {
    if (typeof response?.setHeader !== 'function') return;
    response.setHeader(RATE_LIMIT_HEADER_LIMIT, String(decision.limit));
    response.setHeader(RATE_LIMIT_HEADER_REMAINING, String(decision.remaining));
    response.setHeader(RATE_LIMIT_HEADER_RESET, String(decision.resetSeconds));
    response.setHeader(RATE_LIMIT_HEADER_WINDOW, String(decision.windowMs));
  }
}
