import { resolveDefaultDoctorId } from "./appointment-doctor-helpers";
import { resolveDefaultStartTime } from "./appointment-time-helpers";

export function buildDefaultAppointmentValues(params: {
  selectedDate?: Date;
  startHour: number;
  endHour: number;
  clinicTimezone: string;
  defaultDoctorId?: string;
  unavailableIds: Set<string>;
  user: { id: string; clinicId: string; role: string } | undefined;
  filteredDoctors: { id: string }[];
  preselectedPatientId?: string;
}) {
  return {
    patientId: params.preselectedPatientId || "",
    doctorId: resolveDefaultDoctorId(params),
    clinicId: params.user?.clinicId || "",
    startTime: resolveDefaultStartTime(params),
    endTime: "",
    status: "scheduled" as const,
    type: "consultation" as const,
    notes: "",
  };
}

export function buildFormResetValues(
  open: boolean | undefined,
  selectedDate: Date | undefined,
  defaultValues: ReturnType<typeof buildDefaultAppointmentValues>,
) {
  if (open && selectedDate != null) {
    return { ...defaultValues, startTime: "", endTime: "" };
  }
  return defaultValues;
}
