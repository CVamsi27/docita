/**
 * Global Exception Filter
 * Catches all exceptions and formats them into consistent HTTP responses
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApplicationException,
  ValidationException,
  AggregateValidationException,
  NotFoundException,
  ConflictException,
} from '../exceptions';

interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, unknown>;
  errors?: Array<{ field: string; message: string }>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;
    let validationErrors: Array<{ field: string; message: string }> | undefined;

    // Type guard for objects with potential Prisma-like properties
    const isObject = (val: unknown): val is Record<string, unknown> =>
      typeof val === 'object' && val !== null;

    // Handle NestJS error objects
    const exceptionObj = isObject(exception)
      ? (exception as Record<string, any>)
      : undefined;

    // Handle NotFoundException
    if (exception instanceof NotFoundException) {
      statusCode = HttpStatus.NOT_FOUND;
      code = 'NOT_FOUND';
      message = exception.message;
    }
    // Handle ConflictException
    else if (exception instanceof ConflictException) {
      statusCode = HttpStatus.CONFLICT;
      code = 'CONFLICT';
      message = exception.message;
    }
    // Handle AggregateValidationException
    else if (exception instanceof AggregateValidationException) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_FAILED';
      message = 'Validation failed';
      validationErrors = exception.errors.map((e: ValidationException) => ({
        field: e.field,
        message: e.message,
      }));
    }
    // Handle ValidationException
    else if (exception instanceof ValidationException) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_FAILED';
      message = exception.message;
      details = { field: exception.field, value: exception.value };
    }
    // Handle ApplicationException
    else if (exception instanceof ApplicationException) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details as Record<string, unknown>;
    }
    // Handle NestJS HttpException
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const httpResponse = exception.getResponse();
      message =
        typeof httpResponse === 'string'
          ? httpResponse
          : (httpResponse as any).message || JSON.stringify(httpResponse);
      code = 'HTTP_EXCEPTION';
    }
    // Handle Prisma errors
    else if (exceptionObj?.code === 'P2025') {
      statusCode = HttpStatus.NOT_FOUND;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    } else if (exceptionObj?.code === 'P2002') {
      statusCode = HttpStatus.CONFLICT;
      code = 'UNIQUE_CONSTRAINT_VIOLATION';
      const target =
        isObject(exceptionObj.meta) && Array.isArray(exceptionObj.meta.target)
          ? exceptionObj.meta.target
          : [];
      message = `Unique constraint violation on field(s): ${target.join(', ')}`;
    }
    // Unexpected errors
    else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    const errorResponse: ErrorResponse = {
      success: false,
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request?.url,
      ...(details && { details }),
      ...(validationErrors && { errors: validationErrors }),
    };

    response.status(statusCode).json(errorResponse);
  }
}
