import {
  createAppointmentBaseSchema,
  refineCreateAppointmentDateTimes,
} from "../operations/appointments";

/** Appointment booking form with clinic-timezone wall-clock validation. */
export function createAppointmentFormSchema(wallTimezone: string) {
  return createAppointmentBaseSchema.superRefine(
    refineCreateAppointmentDateTimes(wallTimezone),
  );
}
