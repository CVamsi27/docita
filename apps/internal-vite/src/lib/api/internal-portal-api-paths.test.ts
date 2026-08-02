import { describe, expect, it } from "vitest";
import { assertInternalPortalApiRequest } from "./internal-portal-api-paths";

describe("assertInternalPortalApiRequest", () => {
  it("allows skipAuth requests without checking path", () => {
    expect(() =>
      assertInternalPortalApiRequest("/clinics/anything", { skipAuth: true }),
    ).not.toThrow();
  });

  it("allows internal and auth paths", () => {
    expect(() =>
      assertInternalPortalApiRequest("/internal/clinics", {}),
    ).not.toThrow();
    expect(() =>
      assertInternalPortalApiRequest("/auth/validate", {}),
    ).not.toThrow();
    expect(() =>
      assertInternalPortalApiRequest("/monitoring/health", {}),
    ).not.toThrow();
  });

  it("rejects clinic staff API paths", () => {
    expect(() =>
      assertInternalPortalApiRequest("/clinics/c1", {}),
    ).toThrow(/Refusing/);
  });
});
