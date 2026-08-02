import type { Appointment } from "@workspace/types";

export function validateAppointmentData(data: Partial<Appointment>): string[] {
  const errors: string[] = [];

  if (!data.patientId) errors.push("Select a patient");
  if (!data.doctorId) errors.push("Select a doctor");
  if (!data.startTime) errors.push("Choose a start time");

  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (start.getTime() > end.getTime()) {
      errors.push("Choose an end time after the start time");
    }
  }

  return errors;
}
