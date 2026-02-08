export class AppointmentCreatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly clinicId: string,
  ) {}
}
