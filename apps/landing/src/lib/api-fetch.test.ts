import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLandingJson,
  resolvePaymentRedirectLocation,
} from "./api-fetch";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api-fetch", () => {
  describe("fetchLandingJson", () => {
    it("resolves the API URL and returns parsed JSON on a successful response", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, count: 3 }), { status: 200 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await fetchLandingJson(
        "/public/platform-stats",
        "https://landing.docita.work",
      );

      expect(result).toEqual({ ok: true, count: 3 });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://landing.docita.work/api/v1/public/platform-stats",
      );
    });

    it("throws a friendly retry message on a non-OK response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("nope", { status: 500 })),
      );

      await expect(fetchLandingJson("/public/platform-stats")).rejects.toThrow(
        "We could not load this section. Please refresh and try again.",
      );
    });

    it("propagates network failures", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      );

      await expect(fetchLandingJson("/public/platform-stats")).rejects.toThrow(
        "Failed to fetch",
      );
    });
  });

  describe("resolvePaymentRedirectLocation", () => {
    it("returns the Location header for a 3xx redirect", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 302,
            headers: { location: "upi://pay?txn=abc" },
          }),
        ),
      );

      const location = await resolvePaymentRedirectLocation(
        "tok-123",
        "https://landing.docita.work",
      );

      expect(location).toBe("upi://pay?txn=abc");
    });

    it("returns null when the response is not a redirect", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 200,
            headers: { location: "https://example.com" },
          }),
        ),
      );

      const location = await resolvePaymentRedirectLocation(
        "tok-123",
        "https://landing.docita.work",
      );

      expect(location).toBeNull();
    });

    it("URL-encodes the token in the pay path", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: {},
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await resolvePaymentRedirectLocation("a/b c", "https://landing.docita.work");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://landing.docita.work/api/v1/public/patient/pay/a%2Fb%20c",
        { redirect: "manual" },
      );
    });
  });
});
