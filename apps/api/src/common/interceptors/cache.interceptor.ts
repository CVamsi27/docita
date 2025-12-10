import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Cache interceptor that adds cache-control headers to GET requests
 * This helps browsers and CDNs cache responses appropriately
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method === 'GET') {
      return next.handle().pipe(
        tap(() => {
          // Check if the route has a custom cache duration
          const handler = context.getHandler();
          const cacheMetadata = Reflect.getMetadata('cache-duration', handler);

          if (cacheMetadata === 'no-cache') {
            // Don't cache this endpoint
            response.setHeader(
              'Cache-Control',
              'no-store, no-cache, must-revalidate',
            );
            response.setHeader('Pragma', 'no-cache');
            response.setHeader('Expires', '0');
          } else {
            // Default cache duration: 5 minutes for GET requests
            const cacheDuration = cacheMetadata || 300; // 5 minutes in seconds

            response.setHeader(
              'Cache-Control',
              `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`,
            );

            // Add ETag for conditional requests

            response.setHeader('Vary', 'Accept-Encoding');
          }
        }),
      );
    }

    return next.handle();
  }
}

/**
 * Decorator to set custom cache duration for a route
 * Usage: @CacheDuration(600) // Cache for 10 minutes
 */
export const CacheDuration = (seconds: number | 'no-cache') => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('cache-duration', seconds, descriptor.value);
    return descriptor;
  };
};
