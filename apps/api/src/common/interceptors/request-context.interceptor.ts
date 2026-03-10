import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

function readHeaderValue(
  headers: Request['headers'],
  key: 'x-correlation-id' | 'x-request-id',
): string | undefined {
  const value = headers[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    const [first] = value;
    return typeof first === 'string' && first.trim().length > 0
      ? first
      : undefined;
  }

  return undefined;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      readHeaderValue(request.headers, 'x-correlation-id') ||
      readHeaderValue(request.headers, 'x-request-id') ||
      randomUUID();

    response.setHeader('x-correlation-id', correlationId);

    Sentry.setTag('correlationId', correlationId);
    Sentry.setContext('request', {
      id: correlationId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    request.id = correlationId;

    return next.handle().pipe(
      tap(
        () => {},
        (error) => {
          Sentry.captureException(error, {
            tags: { correlationId },
          });
        },
      ),
    );
  }
}
