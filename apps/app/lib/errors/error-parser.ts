

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

interface GenericApiError extends Error {
  status?: number;
  data?: {
    message?: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

export function parseError(error: unknown): ApiError {

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      message: "Network error. Please check your connection.",
      code: "NETWORK_ERROR",
    };
  }

  if (error instanceof Error) {
    if ("status" in error || "data" in error) {
      const apiError = error as GenericApiError;
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

  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
}

export function getErrorMessage(error: unknown): string {
  const parsed = parseError(error);

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

export function handleError(error: unknown, context?: string): void {
  void error;
  void context;
}
