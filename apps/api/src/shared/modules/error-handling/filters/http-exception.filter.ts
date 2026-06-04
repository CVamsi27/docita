import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Inject,
  Optional,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { ErrorSeverity } from '@workspace/db';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { isObject } from '@/shared/modules/error-handling/filters/http-exception.helpers';
import { getMonitoringUserContext } from '@/shared/modules/auth/auth/request-user.util';
import { resolveExceptionResponse } from '@/shared/modules/error-handling/filters/http-exception-resolution';

const MAX_REQUEST_BODY_KEYS = 20;
function summarizeRequestBody(
  body: unknown,
): Record<string, unknown> | undefined {
  if (!isObject(body)) {
    return undefined;
  }

  const keys = Object.keys(body);
  return {
    redacted: true,
    keyCount: keys.length,
    keys: keys.slice(0, MAX_REQUEST_BODY_KEYS),
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Optional()
    @Inject(MonitoringService)
    private monitoringService?: MonitoringService,
    @Optional()
    @Inject(AppConfigService)
    private configService?: AppConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errorType, errorStack, details, errorCode } =
      resolveExceptionResponse(exception, request, this.logger);
    const isHealthProbe = request.path.startsWith('/health');

    if (status >= 500 && !isHealthProbe) {
      const monitoringUser = getMonitoringUserContext(request.user);
      const requestBodySummary = summarizeRequestBody(request.body);
      Sentry.captureException(exception, {
        user: {
          id: monitoringUser.userId,
          username: monitoringUser.clinicId,
        },
        extra: {
          path: request.path,
          method: request.method,
          requestBodySummary,
        },
      });
    }

    if (this.monitoringService && !isHealthProbe) {
      const monitoringUser = getMonitoringUserContext(request.user);
      const requestBodySummary = summarizeRequestBody(request.body);
      this.monitoringService.logError({
        clinicId: monitoringUser.clinicId,
        userId: monitoringUser.userId,
        type: errorType,
        message,
        stack: this.configService?.isDevelopment() ? errorStack : undefined,
        path: request.path,
        method: request.method,
        statusCode: status,
        userAgent: request.headers['user-agent'],
        ip: request.ip || request.headers['x-forwarded-for']?.toString(),
        requestBody: requestBodySummary,
        severity:
          status >= 500 ? ErrorSeverity.CRITICAL : ErrorSeverity.WARNING,
      });
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} ${request.method} ${request.path}: ${message}`,
        errorStack,
      );
    } else if (
      !(exception instanceof ForbiddenException) &&
      !(exception instanceof UnauthorizedException)
    ) {
      this.logger.warn(
        `HTTP ${status} ${request.method} ${request.path}: ${message}`,
        { status, errorType },
      );
    }

    const isDevelopment = this.configService
      ? this.configService.isDevelopment()
      : true;

    const problemDetails = {
      type: `about:blank`,
      title: this.getErrorTitle(status),
      status,
      detail: message,
      instance: request.path,
      timestamp: new Date().toISOString(),

      ...(errorCode ? { code: errorCode } : {}),

      ...(details && typeof details === 'object'
        ? { validationErrors: details }
        : {}),

      ...(isDevelopment && errorStack && { stack: errorStack }),
      ...(isDevelopment && { errorType }),
    };

    response.status(status).json(problemDetails);
  }

  private getErrorTitle(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || 'Unknown Error';
  }
}
