import { describe, expect, it } from "vitest";
import {
  buildResumeFormData,
  hasMeaningfulComplianceDraftData,
  parseOnboardingDraft,
  resolveResumeStep,
  type OnboardingDraft,
} from "./clinic-registration-form-helpers";

const completeClinicDetails = {
  name: "Draft Clinic",
  phone: "9999999999",
  address: "1 Health St",
  type: "GENERAL",
};

function draftAt(step: number, overrides: Partial<OnboardingDraft> = {}) {
  return parseOnboardingDraft({
    clinicDetails: completeClinicDetails,
    compliance: {},
    step,
    savedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  }) as OnboardingDraft;
}

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

  it("round-trips the saved step and full form snapshot", () => {
    const draft = parseOnboardingDraft({
      clinicDetails: completeClinicDetails,
      compliance: {},
      step: 3,
      formData: {
        clinicDetails: completeClinicDetails,
        compliance: {},
        planSelection: {
          tier: "STARTER",
          billingCycle: "MONTHLY",
          price: 0,
          currency: "INR",
        },
        paymentDetails: {},
        teamMembers: [],
        clinicWeeklyHours: [],
      },
      savedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(draft?.step).toBe(3);
    expect(draft?.formData?.teamMembers).toEqual([]);
  });
});

describe("buildResumeFormData", () => {
  it("returns the stored snapshot when present", () => {
    const draft = draftAt(3, {
      formData: {
        clinicDetails: completeClinicDetails,
        compliance: {},
        planSelection: {
          tier: "STARTER",
          billingCycle: "MONTHLY",
          price: 0,
          currency: "INR",
        },
        paymentDetails: {},
        teamMembers: [{ email: "a@b.com", role: "DOCTOR" }],
        clinicWeeklyHours: [],
      },
    });

    expect(buildResumeFormData(draft).teamMembers).toEqual([
      { email: "a@b.com", role: "DOCTOR" },
    ]);
  });

  it("reconstructs clinic details for older drafts without a snapshot", () => {
    const draft = draftAt(1); // draftAt omits formData
    const rebuilt = buildResumeFormData(draft);

    expect(draft.formData).toBeUndefined();
    expect(rebuilt.clinicDetails).toMatchObject({ name: "Draft Clinic" });
  });
});

describe("resolveResumeStep", () => {
  it("resumes on the saved step when clinic details are complete", () => {
    expect(resolveResumeStep(draftAt(3))).toBe(3);
  });

  it("falls back to step 1 when required clinic details are missing", () => {
    expect(
      resolveResumeStep(draftAt(4, { clinicDetails: { name: "Only a name" } })),
    ).toBe(1);
  });

  it("downgrades the compliance step to plan when no onboarding id exists", () => {
    expect(resolveResumeStep(draftAt(5))).toBe(4);
    expect(resolveResumeStep(draftAt(5, { onboardingId: "onb_1" }))).toBe(5);
  });

  it("clamps out-of-range or absent steps", () => {
    // 99 clamps to 5, then downgrades to 4 with no onboarding id.
    expect(resolveResumeStep(draftAt(99))).toBe(4);
    expect(resolveResumeStep(draftAt(99, { onboardingId: "onb_1" }))).toBe(5);
    expect(resolveResumeStep(draftAt(0))).toBe(1);
    expect(
      resolveResumeStep(
        parseOnboardingDraft({
          clinicDetails: completeClinicDetails,
          compliance: {},
          savedAt: "2026-06-01T00:00:00.000Z",
        }) as OnboardingDraft,
      ),
    ).toBe(1);
  });
});
