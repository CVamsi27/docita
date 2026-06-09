

import { describe, expect, it } from "vitest";
import type { DefaultError } from "@tanstack/react-query";
import { ApiError } from "@/lib/errors";

const createRetryFunction = () => {
  return (failureCount: number, error: DefaultError) => {
    if (error instanceof ApiError) {

      if (error.statusCode >= 400 && error.statusCode < 500) return false;
    }

    return failureCount < 2;
  };
};

const createRetryDelayFunction = () => {
  return (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000);
};

describe("React Query Retry Logic (§9.3)", () => {
  const retryFunc = createRetryFunction();
  const retryDelayFunc = createRetryDelayFunction();

  describe("retryFunction behavior", () => {
    it("should retry on network errors (first attempt)", () => {

      const networkError = new Error("Network error") as DefaultError;
      const shouldRetry = retryFunc(0, networkError);
      expect(shouldRetry).toBe(true);
    });

    it("should retry on network errors (second attempt)", () => {
      const networkError = new Error("Network error") as DefaultError;
      const shouldRetry = retryFunc(1, networkError);
      expect(shouldRetry).toBe(true);
    });

    it("should NOT retry on network errors after 2 attempts", () => {
      const networkError = new Error("Network error") as DefaultError;
      const shouldRetry = retryFunc(2, networkError);
      expect(shouldRetry).toBe(false);
    });

    it("should retry on 5xx errors (server errors)", () => {
      const serverError = new ApiError("Server error", 500);
      const shouldRetry = retryFunc(0, serverError as DefaultError);
      expect(shouldRetry).toBe(true);
    });

    it("should retry on 503 Service Unavailable (second attempt)", () => {
      const serviceUnavailableError = new ApiError("Service unavailable", 503);
      const shouldRetry = retryFunc(1, serviceUnavailableError as DefaultError);
      expect(shouldRetry).toBe(true);
    });

    it("should NOT retry after 2 attempts on 5xx errors", () => {
      const serverError = new ApiError("Server error", 500);
      const shouldRetry = retryFunc(2, serverError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 400 Bad Request (4xx client errors)", () => {
      const clientError = new ApiError("Bad request", 400);
      const shouldRetry = retryFunc(0, clientError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 401 Unauthorized", () => {
      const unauthorizedError = new ApiError("Unauthorized", 401);
      const shouldRetry = retryFunc(0, unauthorizedError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 403 Forbidden", () => {
      const forbiddenError = new ApiError("Forbidden", 403);
      const shouldRetry = retryFunc(0, forbiddenError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 404 Not Found", () => {
      const notFoundError = new ApiError("Not found", 404);
      const shouldRetry = retryFunc(0, notFoundError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 409 Conflict", () => {
      const conflictError = new ApiError("Conflict", 409);
      const shouldRetry = retryFunc(0, conflictError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 422 Unprocessable Entity", () => {
      const validationError = new ApiError("Validation failed", 422);
      const shouldRetry = retryFunc(0, validationError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should NOT retry on 429 Too Many Requests (rate limit)", () => {
      const rateLimitError = new ApiError("Too many requests", 429);
      const shouldRetry = retryFunc(0, rateLimitError as DefaultError);
      expect(shouldRetry).toBe(false);
    });
  });

  describe("retryDelayFunction behavior", () => {
    it("should return 1000ms for first retry (2^0 * 1000)", () => {
      const delay = retryDelayFunc(0);
      expect(delay).toBe(1000);
    });

    it("should return 2000ms for second retry (2^1 * 1000)", () => {
      const delay = retryDelayFunc(1);
      expect(delay).toBe(2000);
    });

    it("should return 4000ms for third retry (2^2 * 1000)", () => {
      const delay = retryDelayFunc(2);
      expect(delay).toBe(4000);
    });

    it("should return 8000ms for fourth retry (2^3 * 1000)", () => {
      const delay = retryDelayFunc(3);
      expect(delay).toBe(8000);
    });

    it("should return 16000ms for fifth retry (2^4 * 1000)", () => {
      const delay = retryDelayFunc(4);
      expect(delay).toBe(16000);
    });

    it("should cap at 30000ms (30 seconds) for very high attempt counts", () => {
      const delay = retryDelayFunc(10);
      expect(delay).toBe(30000);
    });

    it("should follow exponential backoff pattern up to cap", () => {
      const delays = [0, 1, 2, 3, 4, 5, 10].map(retryDelayFunc);
      expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
    });
  });

  describe("Integration: Retry scenarios", () => {
    it("should retry network error with increasing delays", () => {
      const networkError = new Error("Network timeout") as DefaultError;

      const shouldRetry1 = retryFunc(0, networkError);
      expect(shouldRetry1).toBe(true);

      const delay1 = retryDelayFunc(0);
      expect(delay1).toBe(1000);

      const shouldRetry2 = retryFunc(1, networkError);
      expect(shouldRetry2).toBe(true);

      const delay2 = retryDelayFunc(1);
      expect(delay2).toBe(2000);

      const shouldRetry3 = retryFunc(2, networkError);
      expect(shouldRetry3).toBe(false);
    });

    it("should NOT retry 400 even after first attempt", () => {
      const clientError = new ApiError("Invalid input", 400);

      const shouldRetry = retryFunc(0, clientError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should retry 500 twice, then stop", () => {
      const serverError = new ApiError("Internal server error", 500);

      expect(retryFunc(0, serverError as DefaultError)).toBe(true);

      expect(retryFunc(1, serverError as DefaultError)).toBe(true);

      expect(retryFunc(2, serverError as DefaultError)).toBe(false);
    });

    it("should handle mixed scenarios correctly", () => {
      const networkError = new Error("Network") as DefaultError;
      const clientError = new ApiError("Bad request", 400);
      const serverError = new ApiError("Server error", 502);

      expect(retryFunc(0, networkError)).toBe(true);
      expect(retryFunc(1, networkError)).toBe(true);
      expect(retryFunc(2, networkError)).toBe(false);

      expect(retryFunc(0, clientError as DefaultError)).toBe(false);

      expect(retryFunc(0, serverError as DefaultError)).toBe(true);
      expect(retryFunc(1, serverError as DefaultError)).toBe(true);
      expect(retryFunc(2, serverError as DefaultError)).toBe(false);
    });
  });

  describe("ApiError statusCode handling", () => {
    it("should respect ApiError with explicit statusCode", () => {
      const apiError = new ApiError("Custom error", 418, "TEAPOT");
      expect(apiError.statusCode).toBe(418);

      const shouldRetry = retryFunc(0, apiError as DefaultError);
      expect(shouldRetry).toBe(false);
    });

    it("should handle ApiError with details", () => {
      const apiError = new ApiError(
        "Validation failed",
        422,
        "VALIDATION_ERROR",
        {
          field: "email",
          reason: "invalid format",
        },
      );
      expect(apiError.statusCode).toBe(422);
      expect(apiError.details).toEqual({
        field: "email",
        reason: "invalid format",
      });

      const shouldRetry = retryFunc(0, apiError as DefaultError);
      expect(shouldRetry).toBe(false);
    });
  });
});
