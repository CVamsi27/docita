import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit: number;
  window: number;
  keyGenerator?: (
    req: Record<string, unknown> & {
      ip?: string;
      user?: Record<string, unknown>;
    },
  ) => string;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private requests = new Map<
    string,
    { count: number; resetTime: number; requests: number[] }
  >();

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request, rateLimitOptions);

    const now = Date.now();
    const windowStart = now - rateLimitOptions.window;

    let rateLimitData = this.requests.get(key);
    if (!rateLimitData) {
      rateLimitData = {
        count: 0,
        resetTime: now + rateLimitOptions.window,
        requests: [],
      };
      this.requests.set(key, rateLimitData);
    }

    rateLimitData.requests = rateLimitData.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    if (rateLimitData.requests.length >= rateLimitOptions.limit) {
      const oldestRequest = rateLimitData.requests[0];
      const retryAfter = Math.ceil(
        (oldestRequest + rateLimitOptions.window - now) / 1000,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          error: 'Too Many Requests',
          retryAfter,
          limit: rateLimitOptions.limit,
          window: rateLimitOptions.window / 1000,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    rateLimitData.requests.push(now);

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      rateLimitOptions.limit - rateLimitData.requests.length,
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil((windowStart + rateLimitOptions.window) / 1000),
    );

    this.cleanupOldEntries();

    return next.handle();
  }

  private generateKey(
    request: Record<string, unknown> & {
      ip?: string;
      connection?: { remoteAddress?: string };
      user?: { id?: string };
    },
    options: RateLimitOptions,
  ): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userId = request.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  private cleanupOldEntries(): void {
    if (Math.random() > 0.01) return;

    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (
        data.requests.length === 0 ||
        data.requests[data.requests.length - 1] < now - 60000
      ) {
        this.requests.delete(key);
      }
    }
  }
}
