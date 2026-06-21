import { describe, expect, it } from "vitest";
import { isClinicProfileComplete } from "./is-clinic-profile-complete";

describe("isClinicProfileComplete", () => {
  it("is complete when a non-empty logo is set", () => {
    expect(isClinicProfileComplete({ logo: "https://cdn.docita/logo.png" })).toBe(
      true,
    );
  });

  it("is incomplete without a usable logo", () => {
    expect(isClinicProfileComplete({ logo: null })).toBe(false);
    expect(isClinicProfileComplete({ logo: undefined })).toBe(false);
    expect(isClinicProfileComplete({ logo: "   " })).toBe(false);
  });

  it("is incomplete for a missing clinic", () => {
    expect(isClinicProfileComplete(null)).toBe(false);
    expect(isClinicProfileComplete(undefined)).toBe(false);
  });
});
