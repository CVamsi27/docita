import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

/**
 * Request Context Interceptor
 * Adds correlation ID to all requests for distributed tracing
 * Integrates with Sentry for error correlation
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate or extract correlation ID
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      uuidv4();

    // Set correlation ID in response header for client reference
    response.setHeader('x-correlation-id', correlationId);

    // Add to Sentry scope for error tracking
    Sentry.setTag('correlationId', correlationId);
    Sentry.setContext('request', {
      id: correlationId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    // Store in Express locals for access in controllers
    request.id = correlationId;

    return next.handle().pipe(
      tap(
        () => {
          // Success case
          const duration = Date.now();
          // Logging will be handled by RequestLoggingInterceptor
        },
        (error) => {
          // Error case - already handled by AllExceptionsFilter
          Sentry.captureException(error, {
            tags: { correlationId },
          });
        },
      ),
    );
  }
}
