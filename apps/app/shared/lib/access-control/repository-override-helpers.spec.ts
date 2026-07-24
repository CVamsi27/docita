import { normalizeOverride } from "./repository-override-helpers";
import { Feature } from "@workspace/types";

describe("normalizeOverride", () => {
  it("returns null when feature is invalid", () => {
    expect(normalizeOverride({ feature: "INVALID", granted: true })).toBeNull();
  });

  it("returns null when feature is not a string", () => {
    expect(normalizeOverride({ feature: 42, granted: true })).toBeNull();
  });

  it("normalizes a valid override", () => {
    const result = normalizeOverride({
      feature: Feature.DIGITAL_PRESCRIPTIONS,
      granted: true,
      reason: "Custom package",
      grantedBy: "admin@example.com",
    });
    expect(result).not.toBeNull();
    expect(result?.feature).toBe(Feature.DIGITAL_PRESCRIPTIONS);
    expect(result?.granted).toBe(true);
    expect(result?.reason).toBe("Custom package");
    expect(result?.grantedBy).toBe("admin@example.com");
    expect(result?.createdAt).toBeInstanceOf(Date);
  });

  it("defaults reason to empty string", () => {
    const result = normalizeOverride({
      feature: Feature.INVOICING,
      granted: false,
    });
    expect(result?.reason).toBe("");
  });

  it("defaults grantedBy to empty string", () => {
    const result = normalizeOverride({
      feature: Feature.INVOICING,
      granted: true,
    });
    expect(result?.grantedBy).toBe("");
  });

  it("parses expiresAt date", () => {
    const result = normalizeOverride({
      feature: Feature.DIGITAL_PRESCRIPTIONS,
      granted: true,
      expiresAt: "2026-12-31",
    });
    expect(result?.expiresAt).toBeInstanceOf(Date);
  });

  it("sets undefined expiresAt when not provided", () => {
    const result = normalizeOverride({
      feature: Feature.DIGITAL_PRESCRIPTIONS,
      granted: true,
    });
    expect(result?.expiresAt).toBeUndefined();
  });
});
