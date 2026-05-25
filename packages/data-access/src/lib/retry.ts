import type { APIError } from "./types";

function isAPIError(error: unknown): error is APIError {
  return (
    error instanceof Error &&
    ("status" in error ||
      "isNetworkError" in error ||
      "isTimeout" in error ||
      "validationErrors" in error)
  );
}

export function shouldRetry(error: APIError): boolean {
  if (error.isNetworkError || error.isTimeout) {
    return true;
  }

  return [500, 502, 503, 504].includes(error.status ?? 0);
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retriesLeft: number,
  totalRetries: number,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft > 0 && isAPIError(error) && shouldRetry(error)) {
      const delay = Math.pow(2, totalRetries - retriesLeft) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return executeWithRetry(fn, retriesLeft - 1, totalRetries);
    }
    throw error;
  }
}
