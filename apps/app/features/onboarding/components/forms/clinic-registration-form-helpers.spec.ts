import { describe, expect, it } from "vitest";
import {
  hasMeaningfulComplianceDraftData,
  parseOnboardingDraft,
} from "./clinic-registration-form-helpers";

describe("clinic registration draft helpers", () => {
  it("preserves accepted agreements and the uploaded signature session", () => {
    const draft = parseOnboardingDraft({
      clinicDetails: {},
      compliance: {
        acceptedSLA: true,
        acceptedPrivacyPolicy: true,
        acceptedDataProcessing: true,
        slaSignatureSessionId: "signature-session",
      },
      savedAt: "2026-06-01T00:00:00.000Z",
      onboardingId: "onboarding-session",
    });

    expect(draft?.compliance).toMatchObject({
      acceptedSLA: true,
      acceptedPrivacyPolicy: true,
      acceptedDataProcessing: true,
      slaSignatureSessionId: "signature-session",
    });
  });

  it("does not treat untouched compliance defaults as meaningful progress", () => {
    expect(
      hasMeaningfulComplianceDraftData({
        acceptedSLA: false,
        acceptedPrivacyPolicy: false,
        acceptedDataProcessing: false,
        enableWhatsApp: false,
        requireConsent: true,
        slaSignatureSessionId: "",
      }),
    ).toBe(false);
  });
});
