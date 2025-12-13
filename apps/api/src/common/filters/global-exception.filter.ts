import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AppErrorCode, ERROR_MESSAGES } from '@workspace/types';

/**
 * Standardized API error response shape
 */
interface ApiErrorResponse {
  success: false;
  error: {
    code: AppErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
    path: string;
  };
}

/**
 * Map HTTP status codes to error codes
 */
function getErrorCodeFromStatus(status: number): AppErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'DUPLICATE_ENTRY';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
    default:
      return 'INTERNAL_ERROR';
  }
}

/**
 * Global exception filter that standardizes all error responses.
 *
 * All exceptions are transformed into a consistent format:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "PATIENT_NOT_FOUND",
 *     "message": "Patient not found",
 *     "details": {}
 *   },
 *   "meta": {
 *     "requestId": "uuid",
 *     "timestamp": "2024-01-01T00:00:00.000Z",
 *     "path": "/api/patients/123"
 *   }
 * }
 * ```
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: AppErrorCode = 'INTERNAL_ERROR';
    let message = ERROR_MESSAGES.INTERNAL_ERROR;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle structured exception responses
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;

        // Check if response has our error code format
        if (responseObj.code && typeof responseObj.code === 'string') {
          errorCode = responseObj.code as AppErrorCode;
          message =
            (responseObj.message as string) ||
            ERROR_MESSAGES[errorCode] ||
            message;
        } else {
          // Standard NestJS exception
          errorCode = getErrorCodeFromStatus(status);
          message =
            (responseObj.message as string) || exception.message || message;
        }

        // Capture validation errors as details
        if (responseObj.errors || responseObj.details) {
          details = (responseObj.errors || responseObj.details) as Record<
            string,
            unknown
          >;
        }
      } else {
        errorCode = getErrorCodeFromStatus(status);
        message = String(exceptionResponse);
      }
    } else if (exception instanceof Error) {
      // Unhandled errors
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        { requestId, path: request.url },
      );
      message = ERROR_MESSAGES.INTERNAL_ERROR;
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    // Log the error
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`[${requestId}] ${errorCode}: ${message}`, {
        status,
        path: request.url,
        method: request.method,
      });
    } else {
      this.logger.warn(`[${requestId}] ${errorCode}: ${message}`, {
        status,
        path: request.url,
      });
    }

    response.status(status).json(errorResponse);
  }
}
