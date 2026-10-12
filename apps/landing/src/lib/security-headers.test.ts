import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("landing response security headers", () => {
  it("allows HTTP development assets to hydrate without an HTTPS upgrade", async () => {
    vi.stubEnv("DEV", true);
    vi.resetModules();
    const { applyLandingSecurityHeaders } = await import("./security-headers");
    const response = applyLandingSecurityHeaders(new Response("ok"));
    const policy = response.headers.get("Content-Security-Policy");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("retains HTTPS upgrade and restrictive policy in production", async () => {
    vi.stubEnv("DEV", false);
    vi.resetModules();
    const { applyLandingSecurityHeaders } = await import("./security-headers");
    const response = applyLandingSecurityHeaders(new Response("ok"));
    const policy = response.headers.get("Content-Security-Policy");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("connect-src 'self'");
    expect(response.headers.get("Strict-Transport-Security")).toContain(
      "max-age=31536000",
    );
  });
});
