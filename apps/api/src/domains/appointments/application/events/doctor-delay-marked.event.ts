export class DoctorDelayMarkedEvent {
  constructor(
    public readonly delayId: string,
    public readonly clinicId: string,
    public readonly doctorId: string,
    public readonly delayMinutes: number,
    public readonly reason: string | undefined,
    public readonly affectedAppointmentIds: string[],
  ) {}
}
