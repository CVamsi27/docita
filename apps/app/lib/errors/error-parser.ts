

import { getUserFacingErrorMessage } from "@workspace/types";

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
      message: "We could not connect right now. Please check your connection.",
      code: "NETWORK_ERROR",
    };
  }

  if (error instanceof Error) {
    if ("status" in error || "data" in error) {
      const apiError = error as GenericApiError;
      return {
        message: getUserFacingErrorMessage(
          {
            status: apiError.status,
            data: {
              message: apiError.data?.message || error.message,
              code: apiError.data?.code,
            },
          },
          {
            fallback: "Please review the information on this screen and try again",
          },
        ),
        code: apiError.data?.code,
        status: apiError.status,
        details: apiError.data?.details,
      };
    }

    return {
      message: getUserFacingErrorMessage(error),
      code: "UNKNOWN_ERROR",
    };
  }

  return {
    message: "Please review the information on this screen and try again",
    code: "UNKNOWN_ERROR",
  };
}

export function getErrorMessage(error: unknown): string {
  return getUserFacingErrorMessage(error);
}

export function handleError(error: unknown, context?: string): void {
  void error;
  void context;
}
