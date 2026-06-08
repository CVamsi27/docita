import type { Appointment, Patient } from "@workspace/types";

export type AppointmentWithRelations = Appointment & {
  patient?: Patient;
  doctor?: { id?: string; name?: string | null } | null;
};
