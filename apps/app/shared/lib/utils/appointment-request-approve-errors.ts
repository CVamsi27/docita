import {
  extractApiValidationErrors,
  extractProblemDetail,
} from "@/lib/utils/api-validation-errors";

export type ApproveScheduleFieldKey = "doctorId" | "startTime" | "endTime";

/**
 * Maps approve PATCH errors (RFC7807 detail + validationErrors) to schedule fields
 * on the appointment-requests panel.
 */
export function extractApproveAppointmentRequestFieldErrors(
  error: unknown,
): Partial<Record<ApproveScheduleFieldKey, string>> {
  const fromApi = extractApiValidationErrors(error);
  const out: Partial<Record<ApproveScheduleFieldKey, string>> = {};

  const pick = (key: ApproveScheduleFieldKey, value: string | undefined) => {
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value;
    }
  };

  pick("doctorId", fromApi.doctorId);
  pick("startTime", fromApi.startTime);
  pick("endTime", fromApi.endTime);

  if (Object.keys(out).length > 0) {
    return out;
  }

  const detail = extractProblemDetail(error);
  if (!detail) {
    return {};
  }

  const overlapMsg =
    "This time overlaps another visit already on this doctor's calendar. Pick a different time or confirm nothing else is booked for this doctor.";
  const detailMap: Record<
    string,
    Partial<Record<ApproveScheduleFieldKey, string>>
  > = {
    "Doctor has conflicting appointment": {
      startTime: overlapMsg,
    },
    "Start time must be before end time": {
      startTime: "End must be after start.",
      endTime: "End must be after start.",
    },
    "Cannot book appointment in the past": {
      startTime: "Choose a future start time.",
      endTime: "Choose a future end time.",
    },
    "Selected doctor is not available here": {
      doctorId: "Pick a doctor who belongs to this clinic.",
    },
  };

  const mapped = detailMap[detail];
  if (mapped) {
    return { ...mapped };
  }

  if (detail.startsWith("Start time") && detail.includes("valid date")) {
    return { startTime: detail };
  }
  if (detail.startsWith("End time") && detail.includes("valid date")) {
    return { endTime: detail };
  }

  return {};
}
