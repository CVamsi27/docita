import { describe, expect, it } from "vitest";
import {
  buildUpstreamApiUrl,
  extractApiV1PathSegments,
  normalizeUpstreamApiUrl,
  rewriteSetCookieForAppProxy,
} from "./upstream-api-proxy.js";

describe("upstream-api-proxy", () => {
  it("normalizes API_URL to /api/v1 upstream base", () => {
    expect(normalizeUpstreamApiUrl("https://api.docita.work/api/v1")).toBe(
      "https://api.docita.work/api/v1",
    );
    expect(normalizeUpstreamApiUrl("https://api.docita.work")).toBe(
      "https://api.docita.work/api/v1",
    );
  });

  it("strips Domain from proxied Set-Cookie headers", () => {
    expect(
      rewriteSetCookieForAppProxy(
        "refresh_token=abc; Path=/api/v1/auth; HttpOnly; Domain=api.docita.work",
      ),
    ).toBe("refresh_token=abc; Path=/api/v1/auth; HttpOnly");
  });

  it("builds upstream paths with query strings", () => {
    const url = buildUpstreamApiUrl(
      ["clinic", "settings"],
      "https://app.docita.work/api/v1/clinic/settings?foo=1",
      "https://api.docita.work/api/v1",
    );

    expect(url).toBe("https://api.docita.work/api/v1/clinic/settings?foo=1");
  });

  it("extracts path segments from /api/v1 requests", () => {
    expect(extractApiV1PathSegments("/api/v1/public/daily-thought")).toEqual([
      "public",
      "daily-thought",
    ]);
    expect(extractApiV1PathSegments("/dashboard")).toBeNull();
  });
});
