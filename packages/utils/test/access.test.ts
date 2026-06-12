import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_MATRIX,
  FEATURE_TIER_MAP,
  Feature,
  Tier,
} from "@workspace/types";
import {
  hasFeatureAccess,
  isFeatureGenerallyAvailable,
} from "../src/billing/tier-rules";

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
  Feature.WHITE_LABEL_BRANDING,
  Feature.LOCKED_CUSTOM_THEME,
]);

describe("@workspace/utils access helpers", () => {
  it("marks planned surfaces as unavailable despite tier mapping", () => {
    expect(isFeatureGenerallyAvailable(Feature.BROADCAST_CAMPAIGNS)).toBe(
      false,
    );
    expect(hasFeatureAccess("PROFESSIONAL", Feature.BROADCAST_CAMPAIGNS)).toBe(
      false,
    );
  });

  it("keeps GA essential features usable from the expected tier", () => {
    expect(isFeatureGenerallyAvailable(Feature.QUEUE_MANAGEMENT)).toBe(true);
    expect(hasFeatureAccess("FREE", Feature.BASIC_PATIENT_MANAGEMENT)).toBe(
      true,
    );
    expect(hasFeatureAccess("FREE", Feature.INVOICING)).toBe(false);
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

  it("blocks clinical features for FRONT_DESK tier name", () => {
    expect(hasFeatureAccess("FRONT_DESK", Feature.DIGITAL_PRESCRIPTIONS)).toBe(
      false,
    );
    expect(hasFeatureAccess("FRONT_DESK", Feature.QUEUE_MANAGEMENT)).toBe(
      true,
    );
  });
});
