import { describe, expect, it } from "vitest";
import { pastDateOfBirthSchema } from "../src/patient/patients";
import { createPatientRequestSchema } from "../src/contracts/patients";
import { patientCreateFormSchema } from "../src/forms/patient-create-form";

// Always compare against real "now" since the schema uses new Date() internally.
// Pick a future date 5 years out so the test is robust to clock drift.
const FUTURE_DOB = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const PAST_DOB = "1990-06-15";

describe("pastDateOfBirthSchema", () => {
  it("accepts a string date in the past", () => {
    const result = pastDateOfBirthSchema.safeParse("2020-01-01");
    expect(result.success).toBe(true);
  });

  it("accepts a Date object in the past", () => {
    const result = pastDateOfBirthSchema.safeParse(new Date("1990-06-15"));
    expect(result.success).toBe(true);
  });

  it("rejects a future string date", () => {
    const result = pastDateOfBirthSchema.safeParse(FUTURE_DOB);
    expect(result.success).toBe(false);
  });

  it("rejects an unparseable string", () => {
    const result = pastDateOfBirthSchema.safeParse("not-a-date");
    expect(result.success).toBe(false);
  });
});

describe("createPatientRequestSchema (DOB validation surfaces through)", () => {
  const baseValid = {
    firstName: "Asha",
    lastName: "Rao",
    phoneNumber: "+919876543210",
    gender: "FEMALE" as const,
  };

  it("rejects a future dateOfBirth", () => {
    const result = createPatientRequestSchema.safeParse({
      ...baseValid,
      dateOfBirth: FUTURE_DOB,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("dateOfBirth")),
      ).toBe(true);
    }
  });

  it("accepts a past dateOfBirth", () => {
    const result = createPatientRequestSchema.safeParse({
      ...baseValid,
      dateOfBirth: PAST_DOB,
    });
    expect(result.success).toBe(true);
  });
});

describe("patientCreateFormSchema (DOB required branch)", () => {
  const baseValid = {
    firstName: "Asha",
    lastName: "Rao",
    phoneNumber: "+919876543210",
    gender: "FEMALE" as const,
    dpdpConsent: { accepted: true, noticeVersion: "1.0" },
  };

  it("rejects when DOB is missing", () => {
    const result = patientCreateFormSchema.safeParse(baseValid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.path.includes("dateOfBirth") && /required/i.test(i.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects when DOB is in the future", () => {
    const result = patientCreateFormSchema.safeParse({
      ...baseValid,
      dateOfBirth: FUTURE_DOB,
    });
    expect(result.success).toBe(false);
  });

  it("accepts when DOB is a past date and consent is acknowledged", () => {
    const result = patientCreateFormSchema.safeParse({
      ...baseValid,
      dateOfBirth: PAST_DOB,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when DPDP consent is missing", () => {
    const result = patientCreateFormSchema.safeParse({
      firstName: "Asha",
      lastName: "Rao",
      phoneNumber: "+919876543210",
      gender: "FEMALE" as const,
      dateOfBirth: PAST_DOB,
    });
    expect(result.success).toBe(false);
  });
});
