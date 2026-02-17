/**
 * Rate Limiting Decorator
 *
 * COST OPTIMIZATION:
 * - Prevents abuse and reduces unnecessary API calls
 * - Protects against DDoS and reduces Railway compute costs
 * - Implements sliding window algorithm for fair distribution
 *
 * USAGE:
 * @RateLimit({ limit: 100, window: 60000 }) // 100 requests per minute
 * @Get('/expensive-operation')
 * async expensiveOperation() { ... }
 */

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
import { Observable, throwError } from 'rxjs';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit: number; // Max requests
  window: number; // Time window in milliseconds
  keyGenerator?: (
    req: Record<string, unknown> & {
      ip?: string;
      user?: Record<string, unknown>;
    },
  ) => string; // Custom key generator (default: IP + userId)
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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

    // Get or initialize rate limit data
    let rateLimitData = this.requests.get(key);
    if (!rateLimitData) {
      rateLimitData = {
        count: 0,
        resetTime: now + rateLimitOptions.window,
        requests: [],
      };
      this.requests.set(key, rateLimitData);
    }

    // Clean up old requests (sliding window)
    rateLimitData.requests = rateLimitData.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Check if limit exceeded
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
          window: rateLimitOptions.window / 1000, // Convert to seconds
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current request
    rateLimitData.requests.push(now);

    // Set rate limit headers
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

    // Cleanup old entries periodically
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

    // Default: IP + userId (if authenticated)
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userId = request.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  private cleanupOldEntries(): void {
    // Clean up every ~1 minute
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

/**
 * Usage Examples:
 *
 * // Basic rate limiting
 * @RateLimit({ limit: 100, window: 60000 }) // 100 per minute
 * @Get('/api/data')
 * async getData() { ... }
 *
 * // Strict rate limiting for expensive operations
 * @RateLimit({ limit: 10, window: 60000 }) // 10 per minute
 * @Post('/api/generate-report')
 * async generateReport() { ... }
 *
 * // Custom key generator (per clinic)
 * @RateLimit({
 *   limit: 1000,
 *   window: 60000,
 *   keyGenerator: (req) => req.user?.clinicId || req.ip
 * })
 * @Get('/api/appointments')
 * async getAppointments() { ... }
 */
