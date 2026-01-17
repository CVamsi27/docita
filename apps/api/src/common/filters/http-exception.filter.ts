import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma, ErrorSeverity } from '@workspace/db';
import { MonitoringService } from '../../monitoring/monitoring.service';
import { ZodValidationException } from 'nestjs-zod';
import { ZodIssue } from 'zod';

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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(MonitoringService)
    private monitoringService?: MonitoringService,
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

    // Detailed Zod logging at the top
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodErrorDetails;
      console.error(
        'Zod Validation Error Details:',
        JSON.stringify(zodError.errors, null, 2),
      );
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let errorType = 'UnknownError';
    let errorStack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorType = exception.name || 'HttpException';
      errorStack = exception.stack;
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
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
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorType = 'PrismaClientKnownRequestError';
      errorStack = exception.stack;
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const fields = (exception.meta?.target as string[]) || ['field'];
          message = `A record with this ${fields.join(', ')} already exists`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference: the related record does not exist';
          break;
        default:
          message = 'Database error occurred';
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

      console.error('Unhandled error details:', {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      });
    } else {
      console.error('Unhandled or Known exception type:', exception);
    }

    if (exception instanceof Error) {
      message = exception.message || message;
      errorType = exception.name || 'Error';
      errorStack = exception.stack;

      console.error('Unhandled error details:', {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      });
    }

    // Log error to monitoring service
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
          (status as number) >= 500
            ? ErrorSeverity.CRITICAL
            : ErrorSeverity.WARNING,
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  }
}
