// Error handling utilities

export interface ErrorWithMessage {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * Safely convert unknown error to ErrorWithMessage
 */
export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    // Fallback for errors that can't be stringified
    return { message: String(error) };
  }
}

/**
 * Get error message from unknown error safely
 */
export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}
