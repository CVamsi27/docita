import {
  extractProblemDetail,
  inferPublicBookingFieldErrorsFromDetail,
  extractApiValidationErrors,
  buildPublicBookingSubmitErrors,
} from "./api-validation-errors";

describe("extractProblemDetail", () => {
  it("returns null for non-ApiError values", () => {
    expect(extractProblemDetail(new Error("test"))).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractProblemDetail(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(extractProblemDetail(undefined)).toBeNull();
  });

  it("returns null for string input", () => {
    expect(extractProblemDetail("error")).toBeNull();
  });

  it("returns null for plain objects without details", () => {
    expect(extractProblemDetail({ message: "error" })).toBeNull();
  });
});

describe("inferPublicBookingFieldErrorsFromDetail", () => {
  it("returns empty object for null detail", () => {
    expect(inferPublicBookingFieldErrorsFromDetail(null)).toEqual({});
  });

  it("returns empty object for undefined detail", () => {
    expect(inferPublicBookingFieldErrorsFromDetail(undefined)).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(inferPublicBookingFieldErrorsFromDetail("")).toEqual({});
  });

  it("maps preferredDoctorId required error", () => {
    const detail = "preferredDoctorId is required when selecting a time slot";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.preferredDoctorId).toBeDefined();
    expect(result.preferredDoctorId.length).toBeGreaterThan(0);
  });

  it("maps selected slot no longer available error", () => {
    const detail = "Selected slot is no longer available";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.requestedSlotStart).toBeDefined();
    expect(result.requestedSlotEnd).toBeDefined();
  });

  it("maps invalid requested slot error", () => {
    const detail = "Invalid requested slot";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.requestedSlotStart).toBeDefined();
    expect(result.requestedSlotEnd).toBeDefined();
  });

  it("maps booking verification token error", () => {
    const detail = "Unexpected booking verification token";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.bookingVerificationToken).toBeDefined();
  });

  it("maps booking verification required error", () => {
    const detail = "Booking verification is required for this phone number";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.bookingVerificationToken).toBeDefined();
  });

  it("maps invalid booking verification error", () => {
    const detail = "Invalid booking verification";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.bookingVerificationToken).toBeDefined();
  });

  it("maps date of birth required error", () => {
    const detail =
      "Date of birth is required when this phone number is not already on file at this clinic";
    const result = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result.dateOfBirth).toBeDefined();
  });

  it("returns empty object for unknown detail string", () => {
    expect(inferPublicBookingFieldErrorsFromDetail("Something else")).toEqual({});
  });

  it("returns a copy, not the original map", () => {
    const detail = "Selected slot is no longer available";
    const result1 = inferPublicBookingFieldErrorsFromDetail(detail);
    const result2 = inferPublicBookingFieldErrorsFromDetail(detail);
    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });
});

describe("extractApiValidationErrors", () => {
  it("returns empty object for non-ApiError", () => {
    expect(extractApiValidationErrors(new Error("test"))).toEqual({});
  });

  it("returns empty object for null", () => {
    expect(extractApiValidationErrors(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(extractApiValidationErrors(undefined)).toEqual({});
  });

  it("returns empty object for plain objects", () => {
    expect(extractApiValidationErrors({ details: {} })).toEqual({});
  });
});

describe("buildPublicBookingSubmitErrors", () => {
  it("returns empty fieldErrors and null generalMessage for non-ApiError", () => {
    const result = buildPublicBookingSubmitErrors(new Error("test"));
    expect(result.fieldErrors).toEqual({});
    expect(result.generalMessage).toBeNull();
  });

  it("returns empty result for null input", () => {
    const result = buildPublicBookingSubmitErrors(null);
    expect(result.fieldErrors).toEqual({});
    expect(result.generalMessage).toBeNull();
  });

  it("returns empty result for undefined input", () => {
    const result = buildPublicBookingSubmitErrors(undefined);
    expect(result.fieldErrors).toEqual({});
    expect(result.generalMessage).toBeNull();
  });
});
