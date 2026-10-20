import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/api-config", () => ({ getAppApiUrl: () => "/api/v1" }));
import { appAuthUserSchema, clinicSchema } from "@workspace/types";
import { resolveDoctorSignatureUrls } from "./verify-doctor-helpers";

const clinic = clinicSchema.parse({
  id: "clinic-1",
  name: "Signature Clinic",
  address: "1 Clinic Street",
  phone: "9876543210",
  email: "clinic@example.com",
  active: true,
  tier: "ESSENTIAL",
  type: "GENERAL",
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  currency: "INR",
  createdAt: "2026-10-10T00:00:00Z",
  updatedAt: "2026-10-10T00:00:00Z",
  subscriptionStatus: "TRIALING",
  intelligenceAddon: "NONE",
  avgConsultationMinutes: 15,
  lateArrivalGraceMinutes: 10,
  queueBufferMinutes: 5,
  useDoctorQueues: false,
  referralCreditsMonths: 0,
});
const profile = appAuthUserSchema.parse({
  id: "doctor-1",
  name: "Signature Doctor",
  email: "doctor@example.com",
  role: "ADMIN_DOCTOR",
  clinicId: clinic.id,
});

describe("doctor signature display and reuse source", () => {
  it.each([
    {
      storedUrl: "/uploads/sla-signatures/signature.png",
      displayUrl: "http://127.0.0.1:3011/uploads/sla-signatures/signature.png",
    },
    {
      storedUrl: "sla-signatures/signature.png",
      displayUrl:
        "https://storage.example.com/signature.png?signature=synthetic-proof",
    },
  ])(
    "uses the API-resolved display URL while keeping $storedUrl for the mutation",
    ({ storedUrl, displayUrl }) => {
      const result = resolveDoctorSignatureUrls({
        clinic: {
          ...clinic,
          slaSignatureStoredUrl: storedUrl,
          slaSignatureUrl: displayUrl,
        },
        profile,
        isAdminDoctor: true,
        hasSignature: false,
        clinicLoading: false,
      });

      expect(result.onboardingSignatureSourceUrl).toBe(storedUrl);
      expect(result.resolvedOnboardingSignatureUrl).toBe(displayUrl);
      expect(result.canUseOnboardingSignature).toBe(true);
    },
  );

  it("retains the stored-path fallback when no resolved display URL is available", () => {
    const storedUrl = "/uploads/sla-signatures/signature.png";
    const result = resolveDoctorSignatureUrls({
      clinic: {
        ...clinic,
        slaSignatureStoredUrl: storedUrl,
        slaSignatureUrl: null,
      },
      profile,
      isAdminDoctor: true,
      hasSignature: false,
      clinicLoading: false,
    });

    expect(result.onboardingSignatureSourceUrl).toBe(storedUrl);
    expect(result.resolvedOnboardingSignatureUrl).toBe(
      new URL(storedUrl, window.location.origin).href,
    );
  });

  it("uses an available display URL when no stored reference exists", () => {
    const displayUrl = "https://storage.example.com/signature.png";
    const result = resolveDoctorSignatureUrls({
      clinic: {
        ...clinic,
        slaSignatureStoredUrl: null,
        slaSignatureUrl: displayUrl,
      },
      profile: { ...profile, signatureUrl: displayUrl },
      isAdminDoctor: true,
      hasSignature: true,
      clinicLoading: false,
    });

    expect(result.onboardingSignatureSourceUrl).toBe(displayUrl);
    expect(result.resolvedOnboardingSignatureUrl).toBe(displayUrl);
    expect(result.resolvedProfileSignatureUrl).toBe(displayUrl);
    expect(result.canUseOnboardingSignature).toBe(false);
  });
});
