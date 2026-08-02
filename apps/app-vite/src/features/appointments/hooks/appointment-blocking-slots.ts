export function computeBlockingSlotsFromAppointments<
  T extends {
    startTime: string | Date;
    endTime: string | Date;
    status: string;
  },
>(appointments: T[] | undefined) {
  return (appointments ?? []).map((appointment) => ({
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
  }));
}
