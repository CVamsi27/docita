import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';

export class AppointmentCreatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
    public readonly patientId: string,
    public readonly appointment: Appointment,
  ) {}
}
