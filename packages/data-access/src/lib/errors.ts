import type { APIError } from "./types";

export class APIRequestError extends Error implements APIError {
  status?: number;
  statusText?: string;
  code?: string;
  data?: Record<string, unknown>;
  validationErrors?: Record<string, string>;
  isNetworkError?: boolean;
  isTimeout?: boolean;

  constructor(message: string, options?: Partial<APIError>) {
    super(message);
    this.name = "APIRequestError";
    Object.assign(this, options);
  }

  get hasFieldErrors(): boolean {
    return (
      !!this.validationErrors &&
      Object.keys(this.validationErrors).length > 0
    );
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export function getErrorCode(status: number): string {
  switch (status) {
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 400:
    case 422:
      return ErrorCodes.VALIDATION_ERROR;
    default:
      return status >= 500 ? ErrorCodes.SERVER_ERROR : "UNKNOWN_ERROR";
  }
}
