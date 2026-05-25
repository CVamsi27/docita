import { describe, expect, it } from "vitest";
import { RoleBasedAccessRule } from "./role-based-rule";
import type { IAccessContext } from "@/lib/access-control/interfaces";
import type { UserRole } from "@workspace/types";
import type { Permission } from "@/lib/auth/permissions";

describe("RoleBasedAccessRule", () => {
  const rule = new RoleBasedAccessRule();

  const baseContext = {
    feature: "TEST_FEATURE",
    subscription: {
      tier: "CORE",
      status: "active",
      features: [],
      startDate: new Date(),
      billingCycle: "monthly",
    },
    addOns: [],
  } as Pick<IAccessContext, "feature" | "subscription" | "addOns">;

  it("should have correct name and priority", () => {
    expect(rule.getRuleName()).toBe("RoleBasedAccess");
    expect(rule.getPriority()).toBe(15);
  });

  it("should allow access if no permission is required", () => {
    const context = {
      ...baseContext,
      userId: "123",
      userRole: "DOCTOR",
    } as IAccessContext;
    expect(rule.canAccess(context)).toBe(true);
  });

  it("should allow access if user has required permission", () => {

    const context = {
      ...baseContext,
      userId: "123",
      userRole: "DOCTOR",
      requiredPermission: "viewPatients" as Permission,
    } as IAccessContext;
    expect(rule.canAccess(context)).toBe(true);
  });

  it("should deny access if user lacks required permission", () => {

    const context = {
      ...baseContext,
      userId: "123",
      userRole: "RECEPTIONIST" as UserRole,
      requiredPermission: "startConsultation" as Permission,
    } as IAccessContext;
    expect(rule.canAccess(context)).toBe(false);
  });

  it("should handle INTERNAL correctly", () => {

    const context = {
      ...baseContext,
      userId: "admin",
      userRole: "INTERNAL",
      requiredPermission: "manageTenants" as Permission,
    } as IAccessContext;
    expect(rule.canAccess(context)).toBe(true);
  });
});
