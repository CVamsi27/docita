import { describe, expect, it } from "vitest";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { canAccessTarget } from "./access-policy";

describe("canAccessTarget", () => {
  it("allows billing access only for billing roles", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "ADMIN",
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "ADMIN_DOCTOR",
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "DOCTOR",
      }),
    ).toBe(false);
  });

  it("requires both role and feature for analytics page", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "DOCTOR",
        canAccessFeature: () => true,
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "RECEPTIONIST",
        canAccessFeature: () => true,
      }),
    ).toBe(false);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "DOCTOR",
        canAccessFeature: () => false,
      }),
    ).toBe(false);
  });

  it("blocks import page for non-admin roles", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_IMPORT, {
        role: "RECEPTIONIST",
        canAccessFeature: () => true,
      }),
    ).toBe(false);
  });

  it("strictly blocks feature-gated targets when feature checker is missing", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "DOCTOR",
      }),
    ).toBe(false);
  });
});
