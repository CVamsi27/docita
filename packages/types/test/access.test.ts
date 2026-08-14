import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_MATRIX,
  APP_ACCESS_TARGETS,
  APP_PERMISSIONS,
  APP_PERMISSIONS_BY_ROLE,
  getAccessPermissions,
  getAccessRoles,
  hasAppPermission,
  isAccessComingSoon,
  isFrontDeskPlanMode,
  mapClinicTierDbStringToAccessTier,
  mapDbClinicTierStringToTierName,
  resolveClinicPlanMode,
  shouldDenyAccessForFrontDeskMode,
  shouldDenyAccessForFrontDeskTier,
  Tier,
} from "../src";

describe("@workspace/types access contracts", () => {
  it("keeps access matrix targets exhaustive", () => {
    expect(Object.keys(APP_ACCESS_MATRIX).sort()).toEqual(
      Object.values(APP_ACCESS_TARGETS).sort(),
    );
  });

  it("keeps billing page permissions aligned with billing roles", () => {
    expect(getAccessRoles(APP_ACCESS_TARGETS.PAGE_UPGRADE)).toEqual([
      "ADMIN",
      "ADMIN_DOCTOR",
    ]);
    expect(getAccessPermissions(APP_ACCESS_TARGETS.PAGE_UPGRADE)).toEqual([
      "manageBilling",
    ]);
    expect(hasAppPermission("ADMIN", "manageBilling")).toBe(true);
    expect(hasAppPermission("ADMIN_DOCTOR", "manageBilling")).toBe(true);
    expect(hasAppPermission("DOCTOR", "manageBilling")).toBe(false);
  });

  it("does not assign unknown app permissions to any role", () => {
    const knownPermissions = new Set(APP_PERMISSIONS);

    for (const permissions of Object.values(APP_PERMISSIONS_BY_ROLE)) {
      for (const permission of permissions) {
        expect(knownPermissions.has(permission)).toBe(true);
      }
    }

    for (const policy of Object.values(APP_ACCESS_MATRIX)) {
      for (const permission of [
        ...(policy.read?.permissions ?? []),
        ...(policy.write?.permissions ?? []),
      ]) {
        expect(knownPermissions.has(permission)).toBe(true);
      }
    }
  });

  it("marks planned surfaces as unavailable despite tier mapping", () => {
    expect(isAccessComingSoon(APP_ACCESS_TARGETS.PAGE_HOSPITAL)).toBe(true);
    expect(APP_ACCESS_MATRIX[APP_ACCESS_TARGETS.PAGE_HOSPITAL].tier).toBe(
      undefined,
    );
  });

  it("maps clinic DB tier strings consistently", () => {
    expect(mapClinicTierDbStringToAccessTier("STARTER")).toBe(Tier.STARTER);
    expect(mapClinicTierDbStringToAccessTier("ESSENTIAL")).toBe(Tier.ESSENTIAL);
    expect(mapClinicTierDbStringToAccessTier("PROFESSIONAL")).toBe(
      Tier.PROFESSIONAL,
    );
    expect(mapClinicTierDbStringToAccessTier("HOSPITAL")).toBe(Tier.HOSPITAL);
    expect(mapClinicTierDbStringToAccessTier("ENTERPRISE")).toBe(
      Tier.ENTERPRISE,
    );
    expect(mapClinicTierDbStringToAccessTier("UNKNOWN_TIER")).toBe(
      Tier.STARTER,
    );
  });

  it("maps DB tier strings to billing TierName", () => {
    expect(mapDbClinicTierStringToTierName("STARTER")).toBe("STARTER");
    expect(mapDbClinicTierStringToTierName("ESSENTIAL")).toBe("ESSENTIAL");
    expect(mapDbClinicTierStringToTierName("PROFESSIONAL")).toBe(
      "PROFESSIONAL",
    );
    expect(mapDbClinicTierStringToTierName("HOSPITAL")).toBe("HOSPITAL");
    expect(mapDbClinicTierStringToTierName("ENTERPRISE")).toBe("ENTERPRISE");
  });

  it("resolves plan mode from tier and planMode column", () => {
    expect(resolveClinicPlanMode("PROFESSIONAL", "FULL")).toBe("FULL");
    expect(resolveClinicPlanMode("PROFESSIONAL", "FRONT_DESK")).toBe(
      "FRONT_DESK",
    );
    expect(resolveClinicPlanMode("PROFESSIONAL", "CORE")).toBe("CORE");
    expect(resolveClinicPlanMode("ESSENTIAL", null)).toBe("FULL");
    expect(isFrontDeskPlanMode("ESSENTIAL", "FRONT_DESK")).toBe(true);
    expect(isFrontDeskPlanMode("ESSENTIAL", "FULL")).toBe(false);
  });

  it("denies clinical targets for Front Desk mode on non-legacy tier", () => {
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
        "DOCTOR",
        "PROFESSIONAL",
        "FRONT_DESK",
      ),
    ).toBe(true);
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_DASHBOARD,
        "DOCTOR",
        "PROFESSIONAL",
        "FRONT_DESK",
      ),
    ).toBe(false);
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
        "INTERNAL",
        "PROFESSIONAL",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });

  it("shouldDenyAccessForFrontDeskTier delegates when planMode is provided", () => {
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "ADMIN",
        "PROFESSIONAL",
        "FRONT_DESK",
      ),
    ).toBe(true);
  });
});
