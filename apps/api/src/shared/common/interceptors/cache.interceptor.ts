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
import { isRecord } from '@workspace/utils';

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
          const etag = this.createEtag(cachedResponse);
          this.applyCacheHeaders(response, duration, etag);
          const clientEtag = request.headers?.['if-none-match'];
          if (clientEtag === etag) {
            response.status?.(304);
            return of(null);
          }
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
          const etag = this.createEtag(data);
          this.applyCacheHeaders(response, duration, etag);

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
    request: Record<string, unknown> & {
      url?: string;
      originalUrl?: string;
      headers?: Record<string, string>;
    },
  ): string {
    const clinicId = this.extractClinicId(request.user);
    const role = this.extractRole(request.user);
    const normalizedUrl = this.normalizeUrl(request.originalUrl ?? request.url);
    const language = request.headers?.['accept-language'] ?? 'default';
    return `${clinicId}:${role}:${language}:${normalizedUrl}`;
  }

  private extractClinicId(user: unknown): string {
    if (!isRecord(user)) {
      return 'public';
    }

    const clinicId = user['clinicId'];
    return typeof clinicId === 'string' && clinicId.length > 0
      ? clinicId
      : 'public';
  }

  private extractRole(user: unknown): string {
    if (!isRecord(user)) {
      return 'public';
    }

    const role = user['role'];
    return typeof role === 'string' && role.length > 0 ? role : 'public';
  }

  private normalizeUrl(url: string | undefined): string {
    if (!url) {
      return '/';
    }

    const [path, query = ''] = url.split('?');
    if (!query) {
      return path;
    }

    const searchParams = new URLSearchParams(query);
    const sortedParams = [...searchParams.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const normalizedQuery = new URLSearchParams(sortedParams).toString();
    return normalizedQuery ? `${path}?${normalizedQuery}` : path;
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

  private createEtag(data: unknown): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `"${hash}"`;
  }

  private applyCacheHeaders(
    response: Record<string, unknown> & {
      setHeader: (key: string, value: string) => void;
      headersSent?: boolean;
    },
    duration: number,
    etag: string,
  ) {
    if (response.headersSent) return;

    response.setHeader(
      'Cache-Control',
      `private, max-age=${duration}, stale-while-revalidate=30`,
    );
    response.setHeader('ETag', etag);
    response.setHeader(
      'Vary',
      'Authorization, Accept-Encoding, Accept-Language',
    );
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
