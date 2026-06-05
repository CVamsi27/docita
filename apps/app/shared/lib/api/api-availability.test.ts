import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getApiAvailabilitySnapshot,
  isApiAvailabilityError,
  markApiUnavailable,
  resetApiAvailabilityForTests,
  trackApiResponse,
} from "./api-availability";

describe("api availability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetApiAvailabilityForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetApiAvailabilityForTests();
  });

  it("recognizes server, timeout, and network availability failures", () => {
    expect(isApiAvailabilityError({ status: 500 })).toBe(true);
    expect(isApiAvailabilityError({ status: 503 })).toBe(true);
    expect(isApiAvailabilityError({ code: "TIMEOUT" })).toBe(true);
    expect(isApiAvailabilityError({ isNetworkError: true })).toBe(true);
    expect(isApiAvailabilityError({ status: 422 })).toBe(false);
  });

  it("clears the unavailable state after the health probe recovers", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    markApiUnavailable();
    expect(getApiAvailabilitySnapshot().isUnavailable).toBe(true);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getApiAvailabilitySnapshot().isUnavailable).toBe(false);
  });

  it("marks a server response unavailable and a normal response available", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {})),
    );

    trackApiResponse(new Response(null, { status: 502 }));
    expect(getApiAvailabilitySnapshot().isUnavailable).toBe(true);

    trackApiResponse(new Response(null, { status: 401 }));
    expect(getApiAvailabilitySnapshot().isUnavailable).toBe(false);
  });
});
