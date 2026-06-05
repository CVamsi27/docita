import type { APIError } from "./types";

const apiErrorKeys = [
  "status",
  "isNetworkError",
  "isTimeout",
  "validationErrors",
] as const;
const retryableStatuses = new Set([500, 502, 503, 504]);

function isAPIError(error: unknown): error is APIError {
  return error instanceof Error && apiErrorKeys.some((key) => key in error);
}

export function shouldRetry(error: APIError): boolean {
  return [
    error.isNetworkError,
    error.isTimeout,
    retryableStatuses.has(error.status ?? 0),
  ].some(Boolean);
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retriesLeft: number,
  totalRetries: number,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (canRetryFailure(error, retriesLeft)) {
      const delay = Math.pow(2, totalRetries - retriesLeft) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return executeWithRetry(fn, retriesLeft - 1, totalRetries);
    }
    throw error;
  }
}

function canRetryFailure(
  error: unknown,
  retriesLeft: number,
): error is APIError {
  return retriesLeft > 0 && isAPIError(error) && shouldRetry(error);
}
