import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
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
  constructor(
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
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

    const cacheKey = `rate-limit:${key}`;
    let rateLimitData =
      (await this.cacheManager.get<{
        count: number;
        resetTime: number;
      }>(cacheKey)) ?? null;

    if (!rateLimitData || rateLimitData.resetTime <= now) {
      rateLimitData = {
        count: 1,
        resetTime: now + rateLimitOptions.window,
      };
      await this.cacheManager.set(
        cacheKey,
        rateLimitData,
        rateLimitOptions.window,
      );
    } else {
      if (rateLimitData.count >= rateLimitOptions.limit) {
        const retryAfter = Math.max(
          0,
          Math.ceil((rateLimitData.resetTime - now) / 1000),
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

      rateLimitData.count += 1;
      const remainingWindowMs = Math.max(1, rateLimitData.resetTime - now);
      await this.cacheManager.set(cacheKey, rateLimitData, remainingWindowMs);
    }

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, rateLimitOptions.limit - rateLimitData.count),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(rateLimitData.resetTime / 1000),
    );

    return next.handle();
  }

  private generateKey(
    request: Record<string, unknown> & {
      ip?: string;
      socket?: { remoteAddress?: string };
      user?: { id?: string };
    },
    options: RateLimitOptions,
  ): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    const ip = request.ip || request.socket?.remoteAddress || 'unknown';
    const userId = request.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }
}
