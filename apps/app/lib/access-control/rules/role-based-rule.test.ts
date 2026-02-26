import { describe, expect, it } from "vitest";
import { RoleBasedAccessRule } from "./role-based-rule";
import type { IAccessContext } from "../interfaces";
import type { UserRole } from "@workspace/types";
import type { Permission } from "@/lib/permissions";

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
  } as unknown as Pick<IAccessContext, "feature" | "subscription" | "addOns">;

  it("should have correct name and priority", () => {
    expect(rule.getRuleName()).toBe("RoleBasedAccess");
    expect(rule.getPriority()).toBe(15);
  });

  it("should allow access if no permission is required", () => {
    const context = {
      ...baseContext,
      userId: "123",
      userRole: "DOCTOR",
    } as unknown as IAccessContext;
    expect(rule.canAccess(context)).toBe(true);
  });

  it("should allow access if user has required permission", () => {
    // Doctors have 'viewPatients' permission
    const context = {
      ...baseContext,
      userId: "123",
      userRole: "DOCTOR",
      requiredPermission: "viewPatients" as Permission,
    } as unknown as IAccessContext;
    expect(rule.canAccess(context)).toBe(true);
  });

  it("should deny access if user lacks required permission", () => {
    // Receptionists do NOT have 'createInvoice' permission (view only)
    const context = {
      ...baseContext,
      userId: "123",
      userRole: "RECEPTIONIST" as UserRole,
      requiredPermission: "createInvoice" as Permission,
    } as unknown as IAccessContext;
    expect(rule.canAccess(context)).toBe(false);
  });

  it("should handle SUPER_ADMIN correctly", () => {
    // Super admins have 'manageTenants'
    const context = {
      ...baseContext,
      userId: "admin",
      userRole: "SUPER_ADMIN",
      requiredPermission: "manageTenants" as Permission,
    } as unknown as IAccessContext;
    expect(rule.canAccess(context)).toBe(true);
  });
});
