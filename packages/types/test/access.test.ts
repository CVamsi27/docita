import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_MATRIX,
  APP_ACCESS_TARGETS,
  APP_PERMISSIONS,
  APP_PERMISSIONS_BY_ROLE,
  FEATURE_TIER_MAP,
  Feature,
  getAccessPermissions,
  getAccessRoles,
  hasAppPermission,
  hasFeatureAccess,
  isAccessComingSoon,
  isFeatureGenerallyAvailable,
  mapClinicTierDbStringToAccessTier,
  mapDbClinicTierStringToTierName,
  Tier,
} from "../src";

const INTENTIONAL_GA_SUBFEATURES = new Set<Feature>([
  Feature.PAPER_SCANNING,
  Feature.PATIENT_DEDUPLICATION,
  Feature.EXPORT_CSV,
  Feature.OCR_BASIC,
  Feature.VISIT_HISTORY,
  Feature.MEDICINES_LIST,
  Feature.AUTO_REMINDERS,
  Feature.PRESCRIPTION_TEMPLATES,
  Feature.MULTI_DEVICE,
  Feature.ROLE_MANAGEMENT,
  Feature.CONSENT_MANAGEMENT,
  Feature.DOCTOR_SIGNATURE,
  Feature.LEAVE_MANAGEMENT,
  Feature.MULTI_DOCTOR,
  Feature.AUDIT_LOGS,
  Feature.INSURANCE_BILLING,
  Feature.DIGITAL_INTAKE_FORMS,
  Feature.OCR_ADVANCED,
  Feature.ADVANCED_ANALYTICS,
  Feature.WHATSAPP_MANAGED_NUMBER,
]);

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
    expect(isFeatureGenerallyAvailable(Feature.BROADCAST_CAMPAIGNS)).toBe(
      false,
    );
    expect(hasFeatureAccess("PROFESSIONAL", Feature.BROADCAST_CAMPAIGNS)).toBe(
      false,
    );
    expect(isAccessComingSoon(APP_ACCESS_TARGETS.PAGE_HOSPITAL)).toBe(true);
    expect(APP_ACCESS_MATRIX[APP_ACCESS_TARGETS.PAGE_HOSPITAL].tier).toBe(
      undefined,
    );
  });

  it("keeps GA essential features usable from the expected tier", () => {
    expect(isFeatureGenerallyAvailable(Feature.QUEUE_MANAGEMENT)).toBe(true);
    expect(hasFeatureAccess("STARTER", Feature.QUEUE_MANAGEMENT)).toBe(false);
    expect(hasFeatureAccess("ESSENTIAL", Feature.QUEUE_MANAGEMENT)).toBe(true);
    expect(Tier.ESSENTIAL).toBeGreaterThan(Tier.STARTER);
  });

  it("maps every generally available tier feature to access or an intentional subfeature", () => {
    const directlyGatedFeatures = new Set(
      Object.values(APP_ACCESS_MATRIX)
        .map((policy) => policy.feature)
        .filter((feature): feature is Feature => feature !== undefined),
    );

    for (const feature of Object.keys(FEATURE_TIER_MAP) as Feature[]) {
      if (!isFeatureGenerallyAvailable(feature)) {
        continue;
      }

      expect(
        directlyGatedFeatures.has(feature) ||
          INTENTIONAL_GA_SUBFEATURES.has(feature),
        `${feature} must be route/API gated or documented as a subfeature`,
      ).toBe(true);
    }
  });

  it("maps clinic DB tier strings consistently including legacy values", () => {
    expect(mapClinicTierDbStringToAccessTier("STARTER")).toBe(Tier.STARTER);
    expect(mapClinicTierDbStringToAccessTier("ESSENTIAL")).toBe(Tier.ESSENTIAL);
    expect(mapClinicTierDbStringToAccessTier("FRONT_DESK")).toBe(Tier.FRONT_DESK);
    expect(mapClinicTierDbStringToAccessTier("CORE")).toBe(Tier.ESSENTIAL);
    expect(mapClinicTierDbStringToAccessTier("PLUS")).toBe(Tier.ESSENTIAL);
    expect(mapClinicTierDbStringToAccessTier("CAPTURE")).toBe(Tier.STARTER);
    expect(mapClinicTierDbStringToAccessTier("FREE")).toBe(Tier.STARTER);
    expect(mapClinicTierDbStringToAccessTier("UNKNOWN_TIER")).toBe(
      Tier.STARTER,
    );
  });

  it("maps DB tier strings to billing TierName including FRONT_DESK", () => {
    expect(mapDbClinicTierStringToTierName("FRONT_DESK")).toBe("FRONT_DESK");
    expect(mapDbClinicTierStringToTierName("ESSENTIAL")).toBe("ESSENTIAL");
    expect(mapDbClinicTierStringToTierName("CORE")).toBe("ESSENTIAL");
  });

  it("blocks clinical features for FRONT_DESK tier name", () => {
    expect(hasFeatureAccess("FRONT_DESK", Feature.DIGITAL_PRESCRIPTIONS)).toBe(
      false,
    );
    expect(hasFeatureAccess("FRONT_DESK", Feature.QUEUE_MANAGEMENT)).toBe(
      true,
    );
  });
});
