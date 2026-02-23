/**
 * Error Handling Utilities
 * Standardized error parsing and user-friendly messages
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

/**
 * Parse error to user-friendly message
 */
export function parseError(error: unknown): ApiError {
  // Network error
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      message: "Network error. Please check your connection.",
      code: "NETWORK_ERROR",
    };
  }

  // API error
  if (error instanceof Error) {
    if ("status" in error && "data" in error) {
      const apiError = error as any;
      return {
        message: apiError.data?.message || error.message,
        code: apiError.data?.code,
        status: apiError.status,
        details: apiError.data?.details,
      };
    }

    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
    };
  }

  // Unknown error
  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const parsed = parseError(error);

  // Custom messages for common errors
  const statusMessages: Record<number, string> = {
    400: "Invalid request. Please check your input.",
    401: "You are not authenticated. Please log in.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "This action conflicts with the current state.",
    422: "Validation failed. Please check your input.",
    429: "Too many requests. Please try again later.",
    500: "Server error. Please try again later.",
  };

  if (parsed.status && statusMessages[parsed.status]) {
    return statusMessages[parsed.status];
  }

  return parsed.message;
}

/**
 * Handle API errors in callbacks
 */
export function handleError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const parsed = parseError(error);

  console.error(`Error${context ? ` (${context})` : ""}:`, {
    message,
    code: parsed.code,
    status: parsed.status,
    details: parsed.details,
    fullError: error,
  });

  // In a real app, you might send this to Sentry/logging service
}
