export type PatientResponseType =
  | "CONFIRM"
  | "ON_THE_WAY"
  | "DELAY"
  | "RESCHEDULE"
  | "CANCEL"
  | "UNKNOWN";

/** Resolve a patient WhatsApp response to a translated label (Appointments.patientResponse). */
export function patientResponseLabel(
  type: PatientResponseType,
  delayMinutes: number | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (type === "DELAY") {
    return delayMinutes != null
      ? t("patientResponse.runningLateMinutes", { count: delayMinutes })
      : t("patientResponse.runningLate");
  }
  switch (type) {
    case "CONFIRM":
      return t("patientResponse.confirmed");
    case "ON_THE_WAY":
      return t("patientResponse.onTheWay");
    case "RESCHEDULE":
      return t("patientResponse.askedToReschedule");
    case "CANCEL":
      return t("patientResponse.cancelled");
    default:
      return t("patientResponse.replied");
  }
}
