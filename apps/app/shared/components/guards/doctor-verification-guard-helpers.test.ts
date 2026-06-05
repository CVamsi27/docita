import { describe, expect, it } from "vitest";
import {
  doctorProfileNeedsVerification,
  isDoctorVerificationAllowedPath,
  shouldBlockForDoctorVerification,
  shouldRedirectDoctorToVerification,
} from "./doctor-verification-guard-helpers";

describe("doctor verification guard helpers", () => {
  it("allows only verification and login paths to bypass verification redirects", () => {
    expect(isDoctorVerificationAllowedPath("/verify-doctor")).toBe(true);
    expect(isDoctorVerificationAllowedPath("/verify-doctor/details")).toBe(true);
    expect(isDoctorVerificationAllowedPath("/login")).toBe(true);
    expect(isDoctorVerificationAllowedPath("/appointments")).toBe(false);
    expect(isDoctorVerificationAllowedPath(null)).toBe(false);
  });

  it("requires verification when signature or registration is missing", () => {
    expect(
      doctorProfileNeedsVerification({
        signatureUrl: "https://cdn.example/signature.png",
        registrationNumber: "MCI-123",
      }),
    ).toBe(false);
    expect(
      doctorProfileNeedsVerification({
        signatureUrl: "",
        registrationNumber: "MCI-123",
      }),
    ).toBe(true);
    expect(
      doctorProfileNeedsVerification({
        signatureUrl: "https://cdn.example/signature.png",
        registrationNumber: "",
      }),
    ).toBe(true);
    expect(doctorProfileNeedsVerification(undefined)).toBe(false);
  });

  it("separates blocking and redirect decisions", () => {
    expect(
      shouldBlockForDoctorVerification({
        userPresent: true,
        isDoctor: true,
        isVerificationAllowedPath: false,
        profileError: false,
        profileLoading: false,
        profileFetching: true,
        doctorProfilePresent: false,
      }),
    ).toBe(true);
    expect(
      shouldRedirectDoctorToVerification({
        userPresent: true,
        isDoctor: true,
        needsVerification: true,
        isVerificationAllowedPath: false,
      }),
    ).toBe(true);
    expect(
      shouldRedirectDoctorToVerification({
        userPresent: true,
        isDoctor: true,
        needsVerification: true,
        isVerificationAllowedPath: true,
      }),
    ).toBe(false);
  });
});
