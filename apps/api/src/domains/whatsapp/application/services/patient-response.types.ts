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
