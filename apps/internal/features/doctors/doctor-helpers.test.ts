import { describe, expect, it } from "vitest";
import {
  buildPageMeta,
  DOCTOR_REQUIRES_CLINIC_ERROR,
  doctorDetailsUrl,
  doctorRejectUrl,
  doctorVerifyUrl,
  filterDoctors,
  getVerificationBadgeVariant,
  getVerificationLabel,
  labelForHospitalRole,
  labelForSpecialization,
  LOAD_DOCTOR_DETAILS_ERROR,
  parseDoctorVerificationStatus,
  REJECT_DOCTOR_ERROR,
  REJECT_DOCTOR_REASON_ERROR,
  VERIFY_DOCTOR_ERROR,
} from "./doctor-helpers";

describe("parseDoctorVerificationStatus", () => {
  it("parses every known status", () => {
    expect(parseDoctorVerificationStatus("UNVERIFIED")).toBe("UNVERIFIED");
    expect(parseDoctorVerificationStatus("PENDING")).toBe("PENDING");
    expect(parseDoctorVerificationStatus("VERIFIED")).toBe("VERIFIED");
    expect(parseDoctorVerificationStatus("REJECTED")).toBe("REJECTED");
    expect(parseDoctorVerificationStatus("FAILED")).toBe("FAILED");
  });

  it("returns undefined for unknown values", () => {
    expect(parseDoctorVerificationStatus("UNKNOWN")).toBeUndefined();
    expect(parseDoctorVerificationStatus("verified")).toBeUndefined(); // case-sensitive
  });

  it("returns undefined for empty/undefined input", () => {
    expect(parseDoctorVerificationStatus(undefined)).toBeUndefined();
    expect(parseDoctorVerificationStatus("")).toBeUndefined();
  });
});

describe("labelForSpecialization / labelForHospitalRole", () => {
  it("returns the human label for a known specialization", () => {
    // GENERAL_PRACTICE is a known enum value in the project.
    const result = labelForSpecialization("GENERAL_PRACTICE");
    expect(result).toBe("General Practice");
  });

  it("falls back to the raw value for unknown specializations", () => {
    expect(labelForSpecialization("MADE_UP_SPECIALTY")).toBe(
      "MADE_UP_SPECIALTY",
    );
  });

  it("returns undefined for empty/undefined input on both helpers", () => {
    expect(labelForSpecialization(undefined)).toBeUndefined();
    expect(labelForSpecialization("")).toBeUndefined();
    expect(labelForHospitalRole(undefined)).toBeUndefined();
    expect(labelForHospitalRole("")).toBeUndefined();
  });

  it("returns the human label for a known hospital role", () => {
    const result = labelForHospitalRole("SENIOR_CONSULTANT");
    expect(result).toBe("Senior Consultant");
  });

  it("falls back to the raw value for unknown hospital roles", () => {
    expect(labelForHospitalRole("NOT_A_ROLE")).toBe("NOT_A_ROLE");
  });
});

describe("getVerificationBadgeVariant", () => {
  it("VERIFIED → default", () => {
    expect(getVerificationBadgeVariant("VERIFIED")).toBe("default");
  });

  it.each(["REJECTED", "FAILED"] as const)(
    "%s → destructive",
    (status) => {
      expect(getVerificationBadgeVariant(status)).toBe("destructive");
    },
  );

  it("PENDING → secondary", () => {
    expect(getVerificationBadgeVariant("PENDING")).toBe("secondary");
  });

  it.each([undefined, "UNVERIFIED"] as const)(
    "%s → outline",
    (status) => {
      expect(getVerificationBadgeVariant(status)).toBe("outline");
    },
  );
});

describe("getVerificationLabel", () => {
  it("returns 'Unverified' for undefined", () => {
    expect(getVerificationLabel(undefined)).toBe("Unverified");
  });

  it("title-cases the status", () => {
    expect(getVerificationLabel("VERIFIED")).toBe("Verified");
    expect(getVerificationLabel("PENDING")).toBe("Pending");
    expect(getVerificationLabel("REJECTED")).toBe("Rejected");
    expect(getVerificationLabel("FAILED")).toBe("Failed");
    expect(getVerificationLabel("UNVERIFIED")).toBe("Unverified");
  });
});

describe("filterDoctors", () => {
  const doctors = [
    { name: "Dr. Asha Rao", email: "asha@clinic.test", specialization: "GENERAL_PRACTICE" },
    { name: "Dr. Vikram Iyer", email: "vikram@clinic.test", specialization: "CARDIOLOGY" },
    { name: "Dr. Suresh", email: "suresh@other.test", specialization: "DERMATOLOGY" },
  ];

  it("matches case-insensitively on name", () => {
    expect(filterDoctors(doctors, "asha").map((d) => d.name)).toEqual([
      "Dr. Asha Rao",
    ]);
    expect(filterDoctors(doctors, "RAO").map((d) => d.name)).toEqual([
      "Dr. Asha Rao",
    ]);
  });

  it("matches case-insensitively on email", () => {
    expect(filterDoctors(doctors, "other.test").map((d) => d.name)).toEqual([
      "Dr. Suresh",
    ]);
  });

  it("matches on specialization human label, not enum key", () => {
    // "cardio" matches the CARDIOLOGY label, not the enum value
    const cardiologyMatch = filterDoctors(doctors, "Cardio").map((d) => d.name);
    expect(cardiologyMatch).toContain("Dr. Vikram Iyer");
  });

  it("returns all doctors on empty search", () => {
    expect(filterDoctors(doctors, "")).toHaveLength(doctors.length);
  });

  it("returns [] when nothing matches", () => {
    expect(filterDoctors(doctors, "nonexistent-token-xyz")).toEqual([]);
  });
});

describe("URL builders", () => {
  it("doctorDetailsUrl joins clinicId and doctorId", () => {
    expect(doctorDetailsUrl("clinic_1", "doc_1")).toBe(
      "/internal/clinics/clinic_1/doctors/doc_1",
    );
  });

  it("doctorVerifyUrl uses the doctorId under /admin-verify", () => {
    expect(doctorVerifyUrl("doc_1")).toBe("/internal/doctors/doc_1/admin-verify");
  });

  it("doctorRejectUrl uses the doctorId under /admin-reject", () => {
    expect(doctorRejectUrl("doc_1")).toBe("/internal/doctors/doc_1/admin-reject");
  });
});

describe("error message constants", () => {
  it.each([
    [LOAD_DOCTOR_DETAILS_ERROR, /could not load these doctor details/i],
    [DOCTOR_REQUIRES_CLINIC_ERROR, /choose a clinic/i],
    [VERIFY_DOCTOR_ERROR, /could not verify this doctor/i],
    [REJECT_DOCTOR_REASON_ERROR, /enter a rejection reason/i],
    [REJECT_DOCTOR_ERROR, /could not reject this doctor/i],
  ] as const)("'%s' reads as a user-facing message", (value, pattern) => {
    expect(value).toMatch(pattern);
  });
});

describe("buildPageMeta", () => {
  it("returns loading when no token (no auth yet)", () => {
    const result = buildPageMeta(false, null, false);
    expect(result.pageStatus).toBe("loading");
    expect(result.errorMessage).toBeUndefined();
  });

  it("returns loading when loading=true even with a token", () => {
    const result = buildPageMeta(true, null, true);
    expect(result.pageStatus).toBe("loading");
    expect(result.errorMessage).toBeUndefined();
  });

  it("returns error + user-facing message when error present and token ready", () => {
    const result = buildPageMeta(false, new Error("boom"), true);
    expect(result.pageStatus).toBe("error");
    expect(result.errorMessage).toBeTruthy();
    expect(typeof result.errorMessage).toBe("string");
  });

  it("returns success when token ready, not loading, no error", () => {
    const result = buildPageMeta(false, null, true);
    expect(result.pageStatus).toBe("success");
    expect(result.errorMessage).toBeUndefined();
  });
});
