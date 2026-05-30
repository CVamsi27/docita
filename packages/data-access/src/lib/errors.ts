import { getUserFacingErrorMessage, sanitizeUserFacingMessage } from "@workspace/utils";
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

  /** Backward-compat alias for callers migrating from `ApiValidationError.fieldErrors`. */
  get fieldErrors(): Record<string, string> {
    return this.validationErrors ?? {};
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

function sanitizeFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([field, message]) => {
      if (typeof message !== "string") return [];
      return [[field, sanitizeUserFacingMessage(message, "Please check this field")]];
    }),
  );
}

/**
 * Parses a fetch Response into an APIRequestError. Always returns an Error;
 * field-level errors land on the resulting APIRequestError.validationErrors.
 */
export async function parseApiErrorResponse(
  response: Response,
  fallbackMessage = "Please review the information on this screen and try again",
): Promise<APIRequestError | Error> {
  try {
    const data = await response.json();
    const validationErrors = sanitizeFieldErrors(data.validationErrors);
    const responseCode =
      typeof data.code === "string" ? data.code : undefined;
    const message = getUserFacingErrorMessage(
      {
        status: response.status,
        code: responseCode,
        data: { ...data, message: data.detail || data.message },
      },
      { fallback: fallbackMessage, context: "form" },
    );

    if (Object.keys(validationErrors).length > 0) {
      return new APIRequestError(message, {
        validationErrors,
        status: response.status,
        code: responseCode,
        data,
      });
    }
    return new APIRequestError(message, {
      status: response.status,
      code: responseCode,
      data,
    });
  } catch {
    return new Error(fallbackMessage);
  }
}

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
