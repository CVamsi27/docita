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
import { ZodIssue } from 'zod';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface RequestUser {
  id?: string;
  clinicId?: string;
}

interface ZodErrorDetails {
  errors: ZodIssue[];
}

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

const getErrorCause = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || !('cause' in value)) {
    return undefined;
  }
  return (value as { cause?: unknown }).cause;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

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
      const zodError = exception.getZodError() as ZodErrorDetails;

      const formattedErrors = zodError.errors.reduce(
        (acc, err) => {
          const field = err.path.join('.');
          acc[field] = err.message;
          return acc;
        },
        {} as Record<string, string>,
      );

      details = formattedErrors;
      message = 'Validation failed. Please check the highlighted fields.';

      this.logger.error(
        'Zod Validation Error Details',
        JSON.stringify(formattedErrors, null, 2),
      );
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
      if (isObject(cause) && 'issues' in cause && Array.isArray(cause.issues)) {
        const formattedErrors = (cause.issues as ZodIssue[]).reduce(
          (acc: Record<string, string>, err: ZodIssue) => {
            const field = err.path.join('.');
            acc[field] = err.message;
            return acc;
          },
          {} as Record<string, string>,
        );
        details = formattedErrors;
        message = 'Validation failed. Please check the highlighted fields.';
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as HttpExceptionResponse;
        message =
          (Array.isArray(responseObj.message)
            ? responseObj.message.join(', ')
            : responseObj.message) ||
          responseObj.error ||
          message;

        if (
          Array.isArray(responseObj.message) &&
          responseObj.message.length > 0
        ) {
          details = responseObj.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorType = 'PrismaClientKnownRequestError';
      errorStack = exception.stack;
      switch (exception.code) {
        case 'P1000':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message =
            'Database connection is unavailable. Please try again shortly.';
          details = { code: 'P1000' };
          break;
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const fields = toStringArray(exception.meta?.target);
          const conflictFields = fields.length > 0 ? fields : ['field'];
          message = `A record with this ${conflictFields.join(', ')} already exists`;
          details = {
            field: conflictFields[0],
            constraint: 'unique',
          };
          break;
        }
        case 'P2014':
          status = HttpStatus.BAD_REQUEST;
          message =
            'The change you are trying to make violates a required relation';
          details = { code: 'P2014' };
          break;
        case 'P2016':
          status = HttpStatus.NOT_FOUND;
          message =
            'The query interpretation could not be matched to the database schema';
          details = { code: 'P2016' };
          break;
        case 'P2021':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'The table does not exist in the current database';
          details = { code: 'P2021' };
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found';
          details = { code: 'P2025' };
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference: the related record does not exist';
          details = {
            field: toStringOrUndefined(exception.meta?.field_name) || 'unknown',
            code: 'P2003',
          };
          break;
        case 'P2019':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database input parsing error - malformed input data';
          details = { code: 'P2019' };
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database error occurred';
          details = { code: exception.code };
      }
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

      const errorDetails: Record<string, unknown> = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        toString: exception.toString(),
      };

      const cause = getErrorCause(exception);
      if (cause !== undefined) {
        errorDetails.cause = cause;
      }

      this.logger.error('Unhandled error details', errorDetails);
    } else {
      this.logger.error('Unhandled or Known exception type', {
        exception,
        type: typeof exception,
        message: String(exception),
      });
    }

    if (status >= 500) {
      Sentry.captureException(exception, {
        user: {
          id: (request.user as RequestUser)?.id,
          username: (request.user as RequestUser)?.clinicId,
        },
        extra: {
          path: request.path,
          method: request.method,
          body: request.body,
        },
      });
    }

    if (this.monitoringService) {
      const user = request.user as RequestUser | undefined;
      this.monitoringService.logError({
        clinicId: user?.clinicId,
        userId: user?.id,
        type: errorType,
        message,
        stack: errorStack,
        path: request.path,
        method: request.method,
        statusCode: status,
        userAgent: request.headers['user-agent'],
        ip: request.ip || request.headers['x-forwarded-for']?.toString(),
        requestBody: request.body as Record<
          string,
          string | number | boolean | null | undefined | object
        >,
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
