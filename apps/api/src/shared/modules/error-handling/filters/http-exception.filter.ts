import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { Prisma, ErrorSeverity } from '@workspace/db';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError, ZodIssue } from 'zod';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { mapPrismaKnownRequestError } from '@/shared/modules/error-handling/filters/prisma-error.registry';
import {
  formatZodIssuesToFieldMap,
  getErrorCause,
  isObject,
  readZodIssuesFromCause,
  resolveHttpExceptionMessage,
} from '@/shared/modules/error-handling/filters/http-exception.helpers';
import {
  ConflictDomainError,
  DomainError,
  InvariantViolationError,
  NotFoundDomainError,
} from '@/shared/common/errors/domain.errors';
import { getMonitoringUserContext } from '@/shared/modules/auth/auth/request-user.util';
import { redactPhi } from '@/shared/modules/observability/phi-redactor';

const MAX_REQUEST_BODY_KEYS = 20;
const MAX_VALIDATION_FIELDS = 10;

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

function getRequestId(request: Request): string | undefined {
  const headerValue = request.headers['x-request-id'];
  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }
  if (Array.isArray(headerValue) && typeof headerValue[0] === 'string') {
    return headerValue[0];
  }
  return undefined;
}

function summarizeValidationIssues(issues: ZodIssue[]): {
  issueCount: number;
  fields: string[];
} {
  const fields = [...new Set(issues.map((issue) => issue.path.join('.')))]
    .filter(Boolean)
    .slice(0, MAX_VALIDATION_FIELDS);
  return {
    issueCount: issues.length,
    fields,
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

  catch(
    exception:
      | HttpException
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | ZodValidationException
      | Error,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let errorType = 'UnknownError';
    let errorStack: string | undefined;
    let details: unknown;

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'ZodValidationException';
      const zodError = exception.getZodError();
      const issues = zodError instanceof ZodError ? zodError.issues : [];

      details = formatZodIssuesToFieldMap(issues);
      message = 'Validation failed. Please check the highlighted fields.';

      const summary = summarizeValidationIssues(issues);
      this.logger.warn('[AllExceptionsFilter] Validation error', {
        requestId: getRequestId(request),
        path: request.path,
        method: request.method,
        issueCount: summary.issueCount,
        fields: summary.fields,
      });
    } else if (
      exception instanceof ForbiddenException ||
      exception instanceof UnauthorizedException
    ) {
      status = exception.getStatus();
      message = exception.message;
      errorType = exception.name;

      this.logger.warn(`Auth Error: ${message} (${request.path})`);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorType = exception.name || 'HttpException';
      errorStack = exception.stack;
      const exceptionResponse = exception.getResponse();

      const cause = getErrorCause(exception);
      const causeIssues = readZodIssuesFromCause(cause);
      if (causeIssues) {
        details = formatZodIssuesToFieldMap(causeIssues);
        message = 'Validation failed. Please check the highlighted fields.';
      } else {
        const resolved = resolveHttpExceptionMessage(
          exceptionResponse,
          message,
        );
        message = resolved.message;
        if (resolved.details && resolved.details.length > 0) {
          details = resolved.details;
        }
      }
    } else if (exception instanceof NotFoundDomainError) {
      status = HttpStatus.NOT_FOUND;
      errorType = 'NotFoundDomainError';
      message = exception.message;
    } else if (exception instanceof ConflictDomainError) {
      status = HttpStatus.CONFLICT;
      errorType = 'ConflictDomainError';
      message = exception.message;
    } else if (exception instanceof InvariantViolationError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      errorType = 'InvariantViolationError';
      message = exception.message;
    } else if (exception instanceof DomainError) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'DomainError';
      message = exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorType = 'PrismaClientKnownRequestError';
      errorStack = exception.stack;
      const mapped = mapPrismaKnownRequestError(exception);
      status = mapped.status;
      message = mapped.message;
      details = mapped.details;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'PrismaClientValidationError';
      errorStack = exception.stack;
      const errorMessage = exception.message;

      if (errorMessage.includes('Invalid value for argument')) {
        const match = errorMessage.match(/Invalid value for argument `(\w+)`/);
        const field = match ? match[1] : 'field';
        message = `Invalid value provided for ${field}. Please check the format.`;
      } else {
        message = 'Invalid data provided. Please check your input.';
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      errorType = exception.name || 'Error';
      errorStack = exception.stack;

      const errorDetails = redactPhi({
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        toString: exception.toString(),
        cause: getErrorCause(exception),
      });

      this.logger.error('Unhandled error details', errorDetails);
    } else {
      this.logger.error('Unhandled or Known exception type', {
        exception,
        type: typeof exception,
        message: String(exception),
      });
    }

    if (status >= 500) {
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

    if (this.monitoringService) {
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
      const safeStack =
        typeof errorStack === 'string' ? redactPhi(errorStack) : errorStack;
      this.logger.error(
        `HTTP ${status} ${request.method} ${request.path}: ${redactPhi(message)}`,
        safeStack,
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
