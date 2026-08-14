// jscpd:ignore-start
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
import { shouldCaptureInSentry } from '@/shared/modules/error-handling/sentry.utils';
import {
  DEFAULT_QUERY_BUDGET_PER_REQUEST,
  runWithRequestContext,
} from '@/shared/common/context/request-context.store';

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
// jscpd:ignore-end
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

    // Audit FL8 (2026-05-23): expose the correlation id via AsyncLocalStorage
    // so EventEmitter2 `@OnEvent` handlers and other request-scoped async
    // work can log a coherent trace without having to receive the Express
    // request explicitly.
    return runWithRequestContext(
      {
        correlationId,
        queryCounter: {
          count: 0,
          budget: DEFAULT_QUERY_BUDGET_PER_REQUEST,
          requestId: correlationId,
          route: request.route?.path ?? request.url,
        },
      },
      () =>
        next.handle().pipe(
          tap(
            () => {},
            (error) => {
              if (!shouldCaptureInSentry(error)) {
                return;
              }

              Sentry.captureException(error, {
                tags: { correlationId },
              });
            },
          ),
        ),
    );
  }
}
