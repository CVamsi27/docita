
export { parseError, getErrorMessage, handleError } from "./error-parser";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, "AUTHORIZATION_ERROR", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, "RATE_LIMIT", 429);
  }
}

export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string = "API_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message, code, statusCode);
  }
}

export type LogContextValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | object;

export const errorHandler = {
  getErrorMessage: (error: Error | unknown): string => {
    if (error instanceof AppError) return error.message;
    if (error instanceof Error) return error.message;
    return "An unexpected error occurred";
  },

  isOperationalError: (error: Error | unknown): boolean => {
    if (error instanceof AppError) return error.isOperational;
    return false;
  },

  logError: <
    T extends Record<string, LogContextValue> = Record<string, LogContextValue>,
  >(
    error: Error | unknown,
    context?: T,
  ) => {
    
  },
};
