import { describe, expect, it } from "vitest";
import {
  computeContactCanContinue,
  computeSlotRangeSubmitError,
  computeSubmitRequestReady,
} from "./public-booking-page-state-helpers";

describe("public booking page state helpers", () => {
  it("formats slot range errors", () => {
    expect(computeSlotRangeSubmitError("09:00", "09:30")).toBe("09:00 · 09:30");
    expect(computeSlotRangeSubmitError("09:00", "09:00")).toBe("09:00");
    expect(computeSlotRangeSubmitError(undefined, "09:30")).toBe("09:30");
  });

  it("requires OTP verification when OTP is required", () => {
    expect(
      computeContactCanContinue({
        phone: "9999999999",
        requiresOtp: true,
        verificationToken: null,
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        dpdpConsentAccepted: false,
      }),
    ).toBe(false);
    expect(
      computeSubmitRequestReady({
        slotDate: "2026-06-04",
        visitCanContinue: true,
        phone: "9999999999",
        requiresOtp: true,
        verificationToken: "verified",
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        dpdpConsentAccepted: false,
      }),
    ).toBe(true);
  });

  it("requires demographics and consent when OTP is not required", () => {
    expect(
      computeSubmitRequestReady({
        slotDate: "2026-06-04",
        visitCanContinue: true,
        phone: "9999999999",
        requiresOtp: false,
        verificationToken: null,
        firstName: "Asha",
        lastName: "Rao",
        dateOfBirth: "1990-01-01",
        dpdpConsentAccepted: true,
      }),
    ).toBe(true);
  });
});
