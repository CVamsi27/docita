import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MonitoringService } from '../../monitoring/monitoring.service';
import { Request, Response } from 'express';

interface RequestUser {
  id?: string;
  clinicId?: string;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();

    // Extract user info from JWT if available
    const user = request.user as RequestUser | undefined;
    const userId = user?.id;
    const clinicId = user?.clinicId;

    // Get request metadata
    const method = request.method;
    const path = request.path;
    const userAgent = request.headers['user-agent'];
    const ip =
      request.ip ||
      request.headers['x-forwarded-for']?.toString() ||
      request.socket.remoteAddress;

    // Calculate request size
    const requestSize = request.headers['content-length']
      ? parseInt(request.headers['content-length'], 10)
      : undefined;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Get response size from headers if available
        const responseSize = response.getHeader('content-length')
          ? parseInt(response.getHeader('content-length') as string, 10)
          : undefined;

        // Log the request
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

        // Log slow requests
        if (duration > 3000) {
          this.logger.warn(
            `Slow request: ${method} ${path} took ${duration}ms`,
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log the failed request
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
          error: error.message,
          errorStack: error.stack,
        });

        // Re-throw the error to be handled by the exception filter
        throw error;
      }),
    );
  }
}
