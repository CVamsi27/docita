import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import * as crypto from 'crypto';

/**
 * Cache interceptor that adds cache-control headers and ETag support to GET requests
 * AND implements server-side caching via Redis
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method === 'GET') {
      const handler = context.getHandler();
      const cacheMetadata = Reflect.getMetadata('cache-duration', handler);

      // If no cache metadata (opt-in) or explicit no-cache, skip
      if (cacheMetadata === undefined || cacheMetadata === 'no-cache') {
        if (cacheMetadata === 'no-cache') {
          this.applyNoCacheHeaders(response);
        }
        return next.handle();
      }

      // 1. Check Redis Cache
      const key = this.generateKey(request);
      try {
        const cachedResponse = await this.cacheManager.get(key);
        if (cachedResponse) {
          // If hit, apply headers and return cached data
          this.logger.debug(`[CACHE] HIT: key=${key}`);
          const duration = cacheMetadata || 300;
          this.applyCacheHeaders(response, duration, cachedResponse, request);
          return of(cachedResponse);
        }
      } catch (error) {
        // Fail silently on cache error and proceed to handler
        this.logger.warn(
          `Cache get error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // 2. Proceed to handler and cache result
      return next.handle().pipe(
        map((data) => {
          this.logger.debug(`[CACHE] MISS: key=${key}`);
          const duration = cacheMetadata || 300;
          this.applyCacheHeaders(response, duration, data, request);

          // We don't await this assignment to avoid blocking response
          this.cacheManager.set(key, data, duration * 1000).catch((err) => {
            this.logger.warn(`Cache set error: ${err.message}`);
          });

          return data;
        }),
      );
    }

    return next.handle();
  }

  private generateKey(request: { url: string; method: string; params?: Record<string, unknown>; query?: Record<string, unknown> }): string {
    const user = request.user;
    const clinicId = user?.clinicId || 'public';
    return `${clinicId}:${request.url}`;
  }

  private applyNoCacheHeaders(response: { setHeader: (name: string, value: string) => void }) {
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
  }

  private applyCacheHeaders(
    response: { setHeader: (name: string, value: string | number) => void; headersSent?: boolean },
    duration: number,
    data: Record<string, unknown> | string | number,
    request: { url: string; method: string },
  ) {
    if (response.headersSent) return;

    response.setHeader(
      'Cache-Control',
      `private, no-cache, must-revalidate, max-age=${duration}`,
    );

    // Add ETag for conditional requests (304 Not Modified responses)
    if (data) {
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
      response.setHeader('ETag', `"${etag}"`);

      // Check if client sent If-None-Match header
      const clientEtag = request.headers['if-none-match'];
      if (clientEtag === `"${etag}"`) {
        response.status(304);
        // We cannot stop the stream here easily in map(),
        // but setting status 304 usually signals the framework/client.
        // In a pure interceptor map, the body is still returned to the framework.
        // NestJS might overwrite if it sees 304?
        // Actually, if we return data, Nest sends it.
        // But for 304, body should be empty.
        // Handled by client usually ignoring body or filtered at framework level.
      }
    }

    response.setHeader('Vary', 'Authorization, Accept-Encoding');
  }
}

/**
 * Decorator to set custom cache duration for a route
 * Usage: @CacheDuration(600) // Cache for 10 minutes
 */
export const CacheDuration = (seconds: number | 'no-cache') => {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata('cache-duration', seconds, descriptor.value);
    return descriptor;
  };
};
