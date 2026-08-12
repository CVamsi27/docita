import { describe, expect, it, vi } from "vitest";
import { APP_ACCESS_TARGETS, type UserRole } from "@workspace/types";
import { canAccessTarget } from "./access-policy";

vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (role: string, _permission: string) => role === "ADMIN",
}));

vi.mock("@workspace/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/utils")>();
  return {
    ...actual,
    hasFeatureAccess: () => true,
    getTierName: (tier: number) => String(tier),
  };
});

function context(overrides: Record<string, unknown> = {}) {
  return {
    role: "ADMIN" as UserRole,
    currentTier: 3,
    currentMode: "FULL" as const,
    hasIntelligence: false,
    canAccessFeature: () => true,
    ...overrides,
  };
}

describe("canAccessTarget (C7 snapshot preference)", () => {
  it("prefers the server snapshot entry when present", () => {
    const target = APP_ACCESS_TARGETS.PAGE_CODING_QUEUE;
    expect(
      canAccessTarget(
        target,
        context({
          snapshot: {
            [target]: { read: false, write: false },
          },
        }),
        "read",
      ),
    ).toBe(false);
  });

  it("honors write mode from the snapshot", () => {
    const target = APP_ACCESS_TARGETS.API_PATIENTS;
    expect(
      canAccessTarget(
        target,
        context({
          snapshot: {
            [target]: { read: true, write: false },
          },
        }),
        "write",
      ),
    ).toBe(false);
  });

  it("falls back to the local matrix when the snapshot lacks the target", () => {
    const target = APP_ACCESS_TARGETS.PAGE_DASHBOARD;
    expect(
      canAccessTarget(target, context({ snapshot: {} }), "read"),
    ).toBe(true);
  });

  it("falls back to the local matrix when no snapshot is supplied (no regression)", () => {
    const target = APP_ACCESS_TARGETS.PAGE_DASHBOARD;
    expect(canAccessTarget(target, context(), "read")).toBe(true);
  });
});
