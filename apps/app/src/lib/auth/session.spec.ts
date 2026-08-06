import { describe, expect, it } from "vitest";
import { appSession, resolveAppLoginPath } from "@/lib/auth/session";

describe("resolveAppLoginPath", () => {
  it("routes portal paths to the portal login page", () => {
    expect(resolveAppLoginPath("/portal")).toBe("/portal/login");
    expect(resolveAppLoginPath("/portal/profile")).toBe("/portal/login");
  });

  it("keeps the main app on the default login page", () => {
    expect(resolveAppLoginPath("/dashboard")).toBe("/login");
    expect(resolveAppLoginPath("/settings")).toBe("/login");
  });
});

describe("appSession public QR paths", () => {
  it("keeps signature upload links public when opened from a scanned QR code", () => {
    expect(appSession.isPublicPath("/upload-signature/token-123")).toBe(true);
    expect(
      appSession.isPublicPath("/upload-signature/onboarding?sessionId=sess-1"),
    ).toBe(true);
  });
});
