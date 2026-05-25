import { describe, expect, it } from "vitest";
import {
  isPortalPath,
  PORTAL_ROUTE_PREFIXES,
} from "./shared/lib/internal-portal-routes";

describe("internal portal routes", () => {
  it("includes enterprise-contracts in the allowlist", () => {
    expect(PORTAL_ROUTE_PREFIXES).toContain("/enterprise-contracts");
  });

  it("allows enterprise-contracts paths", () => {
    expect(isPortalPath("/enterprise-contracts")).toBe(true);
    expect(isPortalPath("/enterprise-contracts/draft")).toBe(true);
  });

  it("redirects unknown paths", () => {
    expect(isPortalPath("/unknown-page")).toBe(false);
  });
});
