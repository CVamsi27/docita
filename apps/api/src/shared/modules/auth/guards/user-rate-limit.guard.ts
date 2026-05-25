import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserRateLimitService } from '@/shared/modules/services/user-rate-limit.service';
import { AuthenticatedRequest } from '@workspace/types';
import type { Request as ExpressRequest } from 'express';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

/**
 * Route-level overrides for the per-user rate limiter. Keys are
 * `METHOD url-pattern` (pattern matches against the request's `originalUrl`).
 * A `limit` of 0 skips rate limiting entirely.
 */
interface RouteRateLimitOverride {
  method: string;
  pattern: RegExp;
  limit: number;
  windowMs?: number;
}

const ROUTE_OVERRIDES: RouteRateLimitOverride[] = [
  // Consultation mutations: already debounced + content-hash gated on client.
  // A 20ms-typing clinician can burst up to 1500/min; we keep a safety ceiling
  // but put it well above realistic typing speed.
  {
    method: 'PATCH',
    pattern: /\/appointments\/[^/]+$/,
    limit: 600,
  },
  {
    method: 'PATCH',
    pattern: /\/patients\/[^/]+$/,
    limit: 600,
  },
  {
    method: 'POST',
    pattern: /\/appointments\/[^/]+\/diagnoses$/,
    limit: 300,
  },
  // Typeahead search needs a higher ceiling than the default because each
  // keystroke may cost a query during active entry.
  {
    method: 'GET',
    pattern: /\/clinical\/medical-coding\/(icd|cpt)\/search/,
    limit: 300,
  },
];

const DEFAULT_CLINICIAN_LIMIT = 120;

function resolveOverride(
  method: string,
  url: string,
): RouteRateLimitOverride | undefined {
  return ROUTE_OVERRIDES.find(
    (override) => override.method === method && override.pattern.test(url),
  );
}

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private readonly userRateLimitService: UserRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & ExpressRequest>();
    const userId = getAuthenticatedUserId(request.user);

    if (!userId) {
      return true;
    }

    const method = (request.method ?? 'GET').toUpperCase();
    const url = request.originalUrl ?? request.url ?? '';

    const override = resolveOverride(method, url);
    const limit = override?.limit ?? DEFAULT_CLINICIAN_LIMIT;

    if (!this.userRateLimitService.checkRateLimit(userId, { limit })) {
      const remaining = this.userRateLimitService.getRemainingRequests(
        userId,
        limit,
      );
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
