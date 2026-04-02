import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { Request, Response } from 'express';

function toNumberHeader(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (Array.isArray(value) && value.length > 0) {
    const [first] = value;
    return toNumberHeader(first);
  }

  return undefined;
}

interface RequestUser {
  id?: string;
  clinicId?: string;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private monitoringService: MonitoringService) {}

  private logAccess(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ) {
    this.logger.log(`${method} ${path} ${statusCode} ${duration}ms`);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();

    const user = request.user as RequestUser | undefined;
    const userId = user?.id;
    const clinicId = user?.clinicId;

    const method = request.method;
    const path = request.path;
    const userAgent = request.headers['user-agent'];
    const ip =
      request.ip ||
      request.headers['x-forwarded-for']?.toString() ||
      request.socket.remoteAddress;

    const requestSize = request.headers['content-length']
      ? parseInt(request.headers['content-length'], 10)
      : undefined;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        const responseSize = toNumberHeader(
          response.getHeader('content-length'),
        );

        this.monitoringService.logRequest({
          clinicId,
          userId,
          method,
          path,
          statusCode,
          duration,
          requestSize,
          responseSize,
          userAgent,
          ip,
        });

        this.logAccess(method, path, statusCode, duration);

        if (duration > 3000) {
          this.logger.warn(
            `Slow request: ${method} ${path} took ${duration}ms`,
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;
        const errorMessage =
          typeof error?.message === 'string'
            ? error.message.slice(0, 200)
            : 'request_failed';

        this.monitoringService.logRequest({
          clinicId,
          userId,
          method,
          path,
          statusCode,
          duration,
          requestSize,
          userAgent,
          ip,
          error: errorMessage,
        });

        this.logAccess(method, path, statusCode, duration);

        throw error;
      }),
    );
  }
}
