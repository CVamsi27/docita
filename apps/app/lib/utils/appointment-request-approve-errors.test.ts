import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { extractApproveAppointmentRequestFieldErrors } from "./appointment-request-approve-errors";

function apiProblem(payload: Record<string, unknown>, status = 400) {
  return new ApiError("ignored", status, "VALIDATION_ERROR", payload);
}

describe("extractApproveAppointmentRequestFieldErrors", () => {
  it("uses validationErrors when present", () => {
    const err = apiProblem({
      detail: "Validation failed",
      validationErrors: {
        startTime: "Choose a start time.",
        doctorId: "Select a doctor.",
      },
    });
    expect(extractApproveAppointmentRequestFieldErrors(err)).toEqual({
      startTime: "Choose a start time.",
      doctorId: "Select a doctor.",
    });
  });

  it("maps conflicting appointment detail to start only", () => {
    const err = apiProblem({
      detail: "Doctor has conflicting appointment",
    });
    const fields = extractApproveAppointmentRequestFieldErrors(err);
    expect(fields.startTime).toBeTruthy();
    expect(fields.endTime).toBeUndefined();
  });

  it("maps doctor-not-in-clinic detail", () => {
    const err = apiProblem({
      detail: "Selected doctor is not available here",
    });
    expect(extractApproveAppointmentRequestFieldErrors(err)).toEqual({
      doctorId: "Pick a doctor who belongs to this clinic.",
    });
  });
});
