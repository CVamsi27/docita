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
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.method === 'GET') {
      const handler = context.getHandler();
      const cacheMetadata = Reflect.getMetadata('cache-duration', handler);

      if (cacheMetadata === undefined || cacheMetadata === 'no-cache') {
        if (cacheMetadata === 'no-cache') {
          this.applyNoCacheHeaders(response);
        }
        return next.handle();
      }

      const key = this.generateKey(request);
      try {
        const cachedResponse = await this.cacheManager.get(key);
        if (cachedResponse) {
          this.logger.debug(`[CACHE] HIT: key=${key}`);
          const duration = cacheMetadata || 300;
          this.applyCacheHeaders(response, duration, cachedResponse, request);
          return of(cachedResponse);
        }
      } catch (error) {
        this.logger.warn(
          `Cache get error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      return next.handle().pipe(
        map((data) => {
          this.logger.debug(`[CACHE] MISS: key=${key}`);
          const duration = cacheMetadata || 300;
          this.applyCacheHeaders(response, duration, data, request);

          this.cacheManager.set(key, data, duration * 1000).catch((err) => {
            this.logger.warn(`Cache set error: ${err.message}`);
          });

          return data;
        }),
      );
    }

    return next.handle();
  }

  private generateKey(
    request: Record<string, unknown> & { url?: string },
  ): string {
    const clinicId = this.extractClinicId(request.user);
    return `${clinicId}:${request.url}`;
  }

  private extractClinicId(user: unknown): string {
    if (!user || typeof user !== 'object') {
      return 'public';
    }

    const clinicId = (user as { clinicId?: unknown }).clinicId;
    return typeof clinicId === 'string' && clinicId.length > 0
      ? clinicId
      : 'public';
  }

  private applyNoCacheHeaders(
    response: Record<string, unknown> & {
      setHeader: (key: string, value: string) => void;
    },
  ) {
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
  }

  private applyCacheHeaders(
    response: Record<string, unknown> & {
      setHeader: (key: string, value: string) => void;
      headersSent?: boolean;
      status?: (code: number) => void;
    },
    duration: number,
    data: unknown,
    request: Record<string, unknown> & { headers?: Record<string, string> },
  ) {
    if (response.headersSent) return;

    response.setHeader(
      'Cache-Control',
      `private, no-cache, must-revalidate, max-age=${duration}`,
    );

    if (data) {
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
      response.setHeader('ETag', `"${etag}"`);

      const clientEtag = request.headers?.['if-none-match'];
      if (clientEtag === `"${etag}"`) {
        response.status?.(304);
      }
    }

    response.setHeader('Vary', 'Authorization, Accept-Encoding');
  }
}

export const CacheDuration = (seconds: number | 'no-cache') => {
  return (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata('cache-duration', seconds, descriptor.value);
    return descriptor;
  };
};
