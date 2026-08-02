

import { getUserFacingErrorMessage, isRecord } from "@workspace/utils";

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
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
      const status =
        "status" in error && typeof error.status === "number"
          ? error.status
          : undefined;
      const data =
        "data" in error && isRecord(error.data) ? error.data : undefined;
      return {
        message: getUserFacingErrorMessage(
          {
            status,
            data: {
              message:
                (typeof data?.message === "string" ? data.message : undefined) ||
                error.message,
              code: typeof data?.code === "string" ? data.code : undefined,
            },
          },
          {
            fallback: "Please review the information on this screen and try again",
          },
        ),
        code: typeof data?.code === "string" ? data.code : undefined,
        status,
        details: isRecord(data?.details) ? data.details : undefined,
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
