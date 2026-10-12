import { describe, expect, it } from "vitest";
import { userRoleSchema } from "@workspace/types";
import {
  ADMIN_CONSOLE_ROLES,
  getRoleBadgeVariant,
  getRoleLabel,
} from "./admin-role-presentation";

/**
 * Regression guard for the duplicated-key band-aid this module replaced. The
 * page previously carried `admin`/`ADMIN` and `admin_doctor`/`ADMIN_DOCTOR` in
 * two parallel maps, which meant the UPPER_SNAKE keys were a guess about the
 * wire format rather than a checked fact.
 */
describe("admin role presentation", () => {
  it("names every console role with the canonical UPPER_SNAKE spelling", () => {
    expect(ADMIN_CONSOLE_ROLES).toEqual(["ADMIN", "ADMIN_DOCTOR"]);
  });

  it("keys every named role off the API's userRoleSchema enum", () => {
    const canonical = new Set<string>(userRoleSchema.options);
    for (const role of ADMIN_CONSOLE_ROLES) {
      expect(canonical.has(role)).toBe(true);
    }
  });

  it("labels each canonical role", () => {
    expect(getRoleLabel("ADMIN")).toBe("Clinic Admin");
    expect(getRoleLabel("ADMIN_DOCTOR")).toBe("Admin Doctor");
  });

  it("normalizes casing and whitespace instead of duplicating map keys", () => {
    expect(getRoleLabel("admin")).toBe("Clinic Admin");
    expect(getRoleLabel("admin_doctor")).toBe("Admin Doctor");
    expect(getRoleLabel("  ADMIN  ")).toBe("Clinic Admin");
  });

  it("gives ADMIN and ADMIN_DOCTOR distinct badge variants", () => {
    expect(getRoleBadgeVariant("ADMIN")).toBe("outline");
    expect(getRoleBadgeVariant("ADMIN_DOCTOR")).toBe("default");
    expect(getRoleBadgeVariant("admin")).toBe("outline");
  });

  it("falls back to the raw role and neutral badge for other roles", () => {
    expect(getRoleLabel("DOCTOR")).toBe("DOCTOR");
    expect(getRoleLabel("RECEPTIONIST")).toBe("RECEPTIONIST");
    expect(getRoleBadgeVariant("DOCTOR")).toBe("outline");
    expect(getRoleLabel("")).toBe("");
  });
});
