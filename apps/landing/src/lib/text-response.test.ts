import { describe, expect, it } from "vitest";
import { textResponse } from "./text-response";

describe("textResponse", () => {
  it("returns the body with the requested Content-Type", async () => {
    const response = textResponse("User-agent: *\nAllow: /\n", "text/plain");

    expect(await response.text()).toBe("User-agent: *\nAllow: /\n");
    expect(response.headers.get("content-type")).toBe("text/plain");
  });

  it("sets a one-hour public cache and a matching Expires header", () => {
    const response = textResponse("sitemap", "application/xml");

    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600",
    );

    const expires = response.headers.get("expires");
    expect(expires).not.toBeNull();
    const expiresMs = Date.parse(expires!);
    const nowMs = Date.now();
    // Expires should be ~1h ahead (within a 2s tolerance for test execution).
    expect(expiresMs - nowMs).toBeGreaterThan(3598 * 1000);
    expect(expiresMs - nowMs).toBeLessThanOrEqual(3600 * 1000);
  });
});
