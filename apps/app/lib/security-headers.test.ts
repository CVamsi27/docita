import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./security-headers";

describe("buildContentSecurityPolicy", () => {
  it("falls back to 'unsafe-inline' when no nonce is supplied", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("script-src");
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).not.toContain("'nonce-");
  });

  it("includes the per-request nonce and 'strict-dynamic' when supplied", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abcDEF==",
      isProduction: true,
    });
    expect(csp).toContain("'nonce-abcDEF=='");
    expect(csp).toContain("'strict-dynamic'");
    const scriptSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc, "script-src directive must drop 'unsafe-inline'")
      .toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("never permits 'unsafe-eval' in production builds", () => {
    const csp = buildContentSecurityPolicy({ isProduction: true });
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("blocks framing via frame-ancestors 'none'", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("forbids object embedding", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("object-src 'none'");
  });
});
