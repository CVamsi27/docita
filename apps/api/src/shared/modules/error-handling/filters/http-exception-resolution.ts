import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError, ZodIssue } from 'zod';
import { Request } from 'express';
import {
  ConflictDomainError,
  DomainError,
  InvariantViolationError,
  NotFoundDomainError,
} from '@/shared/common/errors/domain.errors';
import { mapPrismaKnownRequestError } from '@/shared/modules/error-handling/filters/prisma-error.registry';
import {
  formatZodIssuesToFieldMap,
  getErrorCause,
  readProblemErrorCode,
  readZodIssuesFromCause,
  resolveHttpExceptionMessage,
} from '@/shared/modules/error-handling/filters/http-exception.helpers';

const MAX_VALIDATION_FIELDS = 10;

interface ResolvedExceptionResponse {
  status: number;
  message: string;
  errorType: string;
  errorStack?: string;
  details?: unknown;
  errorCode?: string;
}

type ExceptionResolver = (
  exception: unknown,
  request: Request,
  logger: Logger,
) => ResolvedExceptionResponse | null;

const exceptionResolvers: ExceptionResolver[] = [
  resolveZodValidationException,
  resolveAuthException,
  resolveHttpException,
  resolveDomainException,
  resolvePrismaKnownRequestException,
  resolvePrismaValidationException,
  resolveNativeError,
];

export function resolveExceptionResponse(
  exception: unknown,
  request: Request,
  logger: Logger,
): ResolvedExceptionResponse {
  for (const resolver of exceptionResolvers) {
    const resolved = resolver(exception, request, logger);
    if (resolved) return resolved;
  }
  logger.error('Unhandled or Known exception type', {
    exception,
    type: typeof exception,
    message: String(exception),
  });
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    errorType: 'UnknownError',
  };
}

function resolveZodValidationException(
  exception: unknown,
  request: Request,
  logger: Logger,
): ResolvedExceptionResponse | null {
  if (!(exception instanceof ZodValidationException)) return null;
  const zodError = exception.getZodError();
  const issues = zodError instanceof ZodError ? zodError.issues : [];
  const summary = summarizeValidationIssues(issues);
  logger.warn('[AllExceptionsFilter] Validation error', {
    requestId: getRequestId(request),
    path: request.path,
    method: request.method,
    issueCount: summary.issueCount,
    fields: summary.fields,
  });
  return {
    status: HttpStatus.BAD_REQUEST,
    message: 'Validation failed. Please check the highlighted fields.',
    errorType: 'ZodValidationException',
    details: formatZodIssuesToFieldMap(issues),
  };
}

function resolveAuthException(
  exception: unknown,
  request: Request,
  logger: Logger,
): ResolvedExceptionResponse | null {
  if (
    !(exception instanceof ForbiddenException) &&
    !(exception instanceof UnauthorizedException)
  ) {
    return null;
  }
  const exceptionResponse = exception.getResponse();
  const resolved = resolveHttpExceptionMessage(
    exceptionResponse,
    exception.message,
  );
  logger.warn(`Auth Error: ${resolved.message} (${request.path})`);
  return {
    status: exception.getStatus(),
    message: resolved.message,
    errorType: exception.name,
    errorCode: readProblemErrorCode(exceptionResponse),
  };
}

function resolveHttpException(
  exception: unknown,
): ResolvedExceptionResponse | null {
  if (!(exception instanceof HttpException)) return null;
  const exceptionResponse = exception.getResponse();
  const causeIssues = readZodIssuesFromCause(getErrorCause(exception));
  if (causeIssues) {
    return {
      status: exception.getStatus(),
      message: 'Validation failed. Please check the highlighted fields.',
      errorType: exception.name || 'HttpException',
      errorStack: exception.stack,
      details: formatZodIssuesToFieldMap(causeIssues),
    };
  }
  const resolved = resolveHttpExceptionMessage(
    exceptionResponse,
    'An unexpected error occurred',
  );
  return {
    status: exception.getStatus(),
    message: resolved.message,
    errorType: exception.name || 'HttpException',
    errorStack: exception.stack,
    details: resolved.details?.length ? resolved.details : undefined,
    errorCode: readProblemErrorCode(exceptionResponse),
  };
}

function resolveDomainException(
  exception: unknown,
): ResolvedExceptionResponse | null {
  if (exception instanceof NotFoundDomainError) {
    return domainResponse(
      HttpStatus.NOT_FOUND,
      'NotFoundDomainError',
      exception,
    );
  }
  if (exception instanceof ConflictDomainError) {
    return domainResponse(
      HttpStatus.CONFLICT,
      'ConflictDomainError',
      exception,
    );
  }
  if (exception instanceof InvariantViolationError) {
    return domainResponse(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'InvariantViolationError',
      exception,
    );
  }
  if (exception instanceof DomainError) {
    return domainResponse(HttpStatus.BAD_REQUEST, 'DomainError', exception);
  }
  return null;
}

function resolvePrismaKnownRequestException(
  exception: unknown,
): ResolvedExceptionResponse | null {
  if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) return null;
  const mapped = mapPrismaKnownRequestError(exception);
  return {
    status: mapped.status,
    message: mapped.message,
    errorType: 'PrismaClientKnownRequestError',
    errorStack: exception.stack,
    details: mapped.details,
  };
}

function resolvePrismaValidationException(
  exception: unknown,
): ResolvedExceptionResponse | null {
  if (!(exception instanceof Prisma.PrismaClientValidationError)) return null;
  return {
    status: HttpStatus.BAD_REQUEST,
    message: resolvePrismaValidationMessage(exception.message),
    errorType: 'PrismaClientValidationError',
    errorStack: exception.stack,
  };
}

function resolveNativeError(
  exception: unknown,
  _request: Request,
  logger: Logger,
): ResolvedExceptionResponse | null {
  if (!(exception instanceof Error)) return null;
  logger.error('Unhandled error details', buildNativeErrorDetails(exception));
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: exception.message || 'An unexpected error occurred',
    errorType: exception.name || 'Error',
    errorStack: exception.stack,
  };
}

function domainResponse(
  status: number,
  errorType: string,
  exception: DomainError,
): ResolvedExceptionResponse {
  return {
    status,
    errorType,
    message: exception.message,
  };
}

function resolvePrismaValidationMessage(errorMessage: string): string {
  if (!errorMessage.includes('Invalid value for argument')) {
    return 'Invalid data provided. Please check your input.';
  }
  const match = errorMessage.match(/Invalid value for argument `(\w+)`/);
  const field = match ? match[1] : 'field';
  return `Invalid value provided for ${field}. Please check the format.`;
}

function buildNativeErrorDetails(exception: Error): Record<string, unknown> {
  const errorDetails: Record<string, unknown> = {
    name: exception.name,
    message: exception.message,
    stack: exception.stack,
    toString: exception.toString(),
  };
  const cause = getErrorCause(exception);
  if (cause !== undefined) errorDetails.cause = cause;
  return errorDetails;
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
