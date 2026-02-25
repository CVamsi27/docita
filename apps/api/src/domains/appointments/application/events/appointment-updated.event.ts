import { Appointment } from '../../core/entities/appointment.entity';

export class AppointmentUpdatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly newStatus: string,
    public readonly oldStatus: string,
    public readonly appointment: Appointment,
    public readonly oldStartTime?: string | Date,
  ) {}
}
