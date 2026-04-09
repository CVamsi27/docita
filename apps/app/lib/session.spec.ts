import { describe, expect, it } from "vitest";
import { resolveAppLoginPath } from "@/lib/session";

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
