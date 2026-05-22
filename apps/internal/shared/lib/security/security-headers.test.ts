import { afterEach, describe, expect, it, vi } from "vitest";

describe("buildInternalContentSecurityPolicy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadCspBuilder() {
    const mod = await import("./security-headers");
    return mod.buildInternalContentSecurityPolicy;
  }

  it("omits Cloudflare Web Analytics origins outside Cloudflare builds", async () => {
    vi.stubEnv("DOCITA_CLOUDFLARE", "");
    const buildInternalContentSecurityPolicy = await loadCspBuilder();
    const csp = buildInternalContentSecurityPolicy();

    expect(csp).not.toContain("static.cloudflareinsights.com");
    expect(csp).not.toContain("cloudflareinsights.com");
  });

  it("allows Cloudflare Web Analytics when DOCITA_CLOUDFLARE=1", async () => {
    vi.stubEnv("DOCITA_CLOUDFLARE", "1");
    const buildInternalContentSecurityPolicy = await loadCspBuilder();
    const csp = buildInternalContentSecurityPolicy();

    expect(csp).toContain(
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    );
    expect(csp).toContain("https://cloudflareinsights.com");
  });
});
