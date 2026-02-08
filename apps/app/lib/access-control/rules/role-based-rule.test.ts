import { describe, expect, it } from "vitest";
import { RoleBasedAccessRule } from "./role-based-rule";
import type { IAccessContext } from "../interfaces";
import type { UserRole } from "@workspace/types";
import type { Permission } from "@/lib/permissions";

describe("RoleBasedAccessRule", () => {
  const rule = new RoleBasedAccessRule();

  it("should have correct name and priority", () => {
    expect(rule.getRuleName()).toBe("RoleBasedAccess");
    expect(rule.getPriority()).toBe(15);
  });

  it("should allow access if no permission is required", () => {
    const context: IAccessContext = {
      userId: "123",
      userRole: "DOCTOR",
      resource: "patient",
      action: "view",
      // No requiredPermission
    };
    expect(rule.canAccess(context)).toBe(true);
  });

  it("should allow access if user has required permission", () => {
    // Doctors have 'viewPatients' permission
    const context: IAccessContext = {
      userId: "123",
      userRole: "DOCTOR",
      resource: "patient",
      action: "view",
      requiredPermission: "viewPatients" as Permission,
    };
    expect(rule.canAccess(context)).toBe(true);
  });

  it("should deny access if user lacks required permission", () => {
    // Receptionists do NOT have 'createInvoice' permission (view only)
    const context: IAccessContext = {
      userId: "123",
      userRole: "RECEPTIONIST" as UserRole,
      resource: "invoice",
      action: "create",
      requiredPermission: "createInvoice" as Permission,
    };
    expect(rule.canAccess(context)).toBe(false);
  });

  it("should handle SUPER_ADMIN correctly", () => {
    // Super admins have 'manageTenants'
    const context: IAccessContext = {
      userId: "admin",
      userRole: "SUPER_ADMIN",
      resource: "system",
      action: "manage",
      requiredPermission: "manageTenants" as Permission,
    };
    expect(rule.canAccess(context)).toBe(true);
  });
});
