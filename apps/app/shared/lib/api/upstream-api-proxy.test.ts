import { describe, expect, it } from "vitest";
import {
  buildUpstreamApiUrl,
  normalizeUpstreamApiUrl,
} from "./upstream-api-proxy";

describe("upstream-api-proxy", () => {
  it("normalizes API_URL to /api/v1 upstream base", () => {
    expect(normalizeUpstreamApiUrl("https://api.docita.work/api/v1")).toBe(
      "https://api.docita.work/api/v1",
    );
    expect(normalizeUpstreamApiUrl("https://api.docita.work")).toBe(
      "https://api.docita.work/api/v1",
    );
  });

  it("builds upstream paths with query strings", () => {
    const url = buildUpstreamApiUrl(
      ["clinic", "settings"],
      "https://app.docita.work/api/v1/clinic/settings?foo=1",
    );

    expect(url).toBe("https://api.docita.work/api/v1/clinic/settings?foo=1");
  });
});
