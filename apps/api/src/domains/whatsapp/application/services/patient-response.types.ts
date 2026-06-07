/**
 * Relations needed to build an `AppointmentContext` from a loaded
 * appointment. `PatientAppointmentResolverService` and
 * `ResponseHandlerService` both fetch an appointment by id with this exact
 * relation set before normalizing it through `toAppointmentContext` —
 * sharing the `include` shape keeps their queries from drifting apart.
 */
export const APPOINTMENT_CONTEXT_INCLUDE = {
  patient: true,
  doctor: true,
  clinic: true,
} as const;

export type AppointmentContext = {
  id: string;
  startTime: Date;
  patient: { firstName: string; lastName: string; phoneNumber: string };
  doctor: { id: string; name: string };
  clinic: { id: string; name: string };
};

export type DelayContext = {
  delayMinutes: number | null;
  delayMinutesPending: boolean;
  conflictDetected: boolean;
  nextAppointmentTime: Date | null;
};

type AppointmentWithRelations = {
  id: string;
  startTime: Date;
  patient: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  } | null;
  doctor: { id: string; name: string } | null;
  clinic: { id: string; name: string } | null;
};

export function toAppointmentContext(
  appointment: AppointmentWithRelations,
): AppointmentContext | null {
  if (!appointment.patient || !appointment.doctor || !appointment.clinic)
    return null;

  return {
    id: appointment.id,
    startTime: appointment.startTime,
    patient: {
      firstName: appointment.patient.firstName,
      lastName: appointment.patient.lastName,
      phoneNumber: appointment.patient.phoneNumber ?? '',
    },
    doctor: appointment.doctor,
    clinic: appointment.clinic,
  };
}
