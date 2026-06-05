import { describe, expect, it, vi } from "vitest";
import { executeWithRetry, shouldRetry } from "./retry";
import type { APIError } from "./types";

describe("retry", () => {
  it("classifies retryable API errors", () => {
    expect(shouldRetry(apiError({ isNetworkError: true }))).toBe(true);
    expect(shouldRetry(apiError({ isTimeout: true }))).toBe(true);
    expect(shouldRetry(apiError({ status: 503 }))).toBe(true);
    expect(shouldRetry(apiError({ status: 404 }))).toBe(false);
  });

  it("retries retryable API failures with exponential delay", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(apiError({ status: 503 }))
      .mockResolvedValueOnce("ok");

    const result = executeWithRetry(fn, 1, 1);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not retry non-api errors", async () => {
    const error = new Error("boom");
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(error);

    await expect(executeWithRetry(fn, 2, 2)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

function apiError(partial: Partial<APIError>): APIError {
  return Object.assign(new Error("api"), partial);
}
