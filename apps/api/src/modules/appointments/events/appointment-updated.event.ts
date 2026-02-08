import { Appointment } from '@workspace/types';

export class AppointmentUpdatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly appointment: Appointment,
    public readonly oldStartTime?: Date,
  ) {}
}
